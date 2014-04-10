""" Utils to interact with GitHub API
"""
import requests

from commitator import *

#################################
#  Organization level API info  #
#################################
params = {}
if ACCESS_TOKEN:
    params = {'access_token': ACCESS_TOKEN}
def get_org_repos(org):
    """Return all repositories within an Organization
    """
    return requests.get(GH_ORG_REPOS.format(org=org), params=params).json()


def get_commits_org(org):
    """ Returns a list of repository: #commits for all the repositories

    in the organization.
    """
    repos = get_org_repos(org)
    result = {}
    for repo in repos:
        commits = len(get_commits_repo(org, repo['name']))
        result[repo['name']] = commits
    return result


#################################
#  Repository level API info  #
#################################

#XXX Get paginated data!
def get_commits_repo(user, repo):
    """ Return the number of commits of the requested user's repository
    """
    return requests.get(GH_REPO_COMMITS.format(user=user, repo=repo), params=params).json()
