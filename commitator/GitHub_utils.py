""" Utils to interact with GitHub API
"""
import requests
import gevent

from gevent import monkey; monkey.patch_all()

from commitator import *

params = {}
if ACCESS_TOKEN:
    params = {'access_token': ACCESS_TOKEN}

##################################
# General manipulation functions #
##################################
def get_next_page(request):
    """ Returns the next page from a GitHub API paginated response

    :params r: Request object, GitHub API call response
    """
    link = request.headers.get('link', '')
    if (link):
        for href_rel in link.split(', '):
            href, rel = href_rel.split('; ')
            if rel.count('next'):
                return href.replace('<', '').replace('>', '')
        return False
    return False


#################################
#  Organization level API info  #
#################################
def get_org_repos(org):
    """Return all repositories within an Organization
    """
    r = requests.get(GH_ORG_REPOS.format(org=org), params=params)
    repos = r.json()
    next = get_next_page(r)
    while next:
        r = requests.get(next, params=params)
        repos += r.json()
        next = get_next_page(r)
    return repos


def get_commits_org(org, since, until):
    """ Returns a dictionary of pairs {repository: commits} for all the repositories

    in the organization within the specified dates.
    """
    repos = get_org_repos(org)
    result = {}
    jobs = [gevent.spawn(get_commits_repo, org, repo['name'], since, until) for repo in repos]
    gevent.joinall(jobs)
    for job in jobs:
        commits = job.value[1]
        result[job.value[0]] = commits
    return result


#################################
#  Repository level API info  #
#################################

def get_commits_repo(user, repo, since, until):
    """ Return the number of commits of the requested user's repository
    """
    params['since'] = since
    params['until'] = until
    # First page of commits always available
    r = requests.get(GH_REPO_COMMITS.format(user=user, repo=repo), params=params)
    commits = r.json()
    next = get_next_page(r)
    while next:
        r = requests.get(next, params=params)
        commits += r.json()
        next = get_next_page(r)
    return (repo, commits)
