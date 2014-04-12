""" Utils to interact with GitHub API
"""
import requests
import gevent

from gevent import monkey; monkey.patch_all()

from commitator import *

params = {}
if ACCESS_TOKEN:
    params = {'access_token': ACCESS_TOKEN}

#################################
#  Organization level API info  #
#################################
def get_org_repos(org):
    """Return all repositories within an Organization
    """
    return requests.get(GH_ORG_REPOS.format(org=org), params=params, verify=False).json()


def get_commits_org(org, since, until):
    """ Returns a list of repository: #commits for all the repositories

    in the organization within the specified dates.
    """
    repos = get_org_repos(org)
    result = {}
    jobs = [gevent.spawn(get_commits_repo, org, repo['name'], since, until) for repo in repos]
    gevent.joinall(jobs)
    for job in jobs:
        commits = len(job.value[1])
        result[job.value[0]] = commits
    return result


#################################
#  Repository level API info  #
#################################

#XXX Get paginated data!
def get_commits_repo(user, repo, since, until):
    """ Return the number of commits of the requested user's repository
    """
    params['since'] = since
    params['until'] = until
    return (repo, requests.get(GH_REPO_COMMITS.format(user=user, repo=repo), params=params, verify=False).json())
