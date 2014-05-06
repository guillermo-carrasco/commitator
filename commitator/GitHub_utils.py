""" Utils to interact with GitHub API
"""
import requests
import gevent

from gevent import monkey; monkey.patch_all()

from commitator import *


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
def get_all_info(org, since=None, until=None):
    """ Return a JSON file containing all the information from an organization.
    """
    info = {}
    info['basic_info'] = get_org_basic_info(org)
    info['members'] = get_org_members(org)
    info['repos'] = get_org_repos(org)
    commits = get_org_commits(org, since, until)
    for repo, commit_list in commits.iteritems():
        info['repos'][repo]['commits'] = commit_list
    return info

def get_org_basic_info(org):
    """ Returns basic information of the organization
    """
    r = requests.get(GH_ORG.format(org=org))
    return r.json()

def get_org_members(org):
    """ Return all members for an organization
    """
    params = {}
    if ACCESS_TOKEN:
        params['access_token'] = ACCESS_TOKEN
    r = requests.get(GH_ORG_MEMBERS.format(org=org), params=params)
    members = r.json()
    next = get_next_page(r)
    while next:
        r = requests.get(next, params=params)
        members.extend(r.json())
        next = get_next_page(r)
    result = {}
    for member in members:
        result[member['id']] = member
    return result


def get_org_repos(org):
    """Return all repositories within an Organization
    """
    params = {}
    if ACCESS_TOKEN:
        params['access_token'] = ACCESS_TOKEN
    r = requests.get(GH_ORG_REPOS.format(org=org), params=params)
    repos = r.json()
    result = {}
    for repo in repos:
        result[repo['name']] = repo
    next = get_next_page(r)
    while next:
        r = requests.get(next, params=params)
        for repo in r.json():
            result[repo['name']] = repo
        next = get_next_page(r)
    return result


def get_org_commits(org, since=None, until=None):
    """ Returns a dictionary of pairs {repository: commits} for all the repositories

    in the organization within the specified dates.
    """
    repos = get_org_repos(org)
    result = {}
    jobs = [gevent.spawn(get_repo_commits, org, repo, since, until) for repo, info in repos.items()]
    gevent.joinall(jobs)
    for job in jobs:
        commits = job.value[1]
        result[job.value[0]] = commits
    return result


###############################
#  Repository level API info  #
###############################

def get_repo_commits(user, repo, since=None, until=None):
    """ Return the number of commits of the requested user's repository
    """
    params = {}
    if ACCESS_TOKEN:
        params['access_token'] = ACCESS_TOKEN
    if since and until:
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


#########################
# GitHub OAuth2 methods #
#########################
def oauth_first_step():
    """ Will return the URL so that the user can grant Commitator read permissions

    on user ans repository information
    """
    params = {}
    if ACCESS_TOKEN:
        params['access_token'] = ACCESS_TOKEN
    if CLIENT_ID:
        params['client_id'] = CLIENT_ID
    params['scopes'] = 'user,repo'
    return GH_OATUH_AUTHORIZE + '?' + '&'.join(["{}={}".format(k,v) for k,v in params.iteritems()])

def oauth_second_step(code):
    """ Fetch and return user token
    """
    params = {}
    if CLIENT_ID:
        params['client_id'] = CLIENT_ID
    if CLIENT_SECRET:
        params['client_secret'] = CLIENT_SECRET
    params['code'] = code

    headers={'Accept': 'application/json'}

    r = requests.post(GH_OATUH_GET_TOKEN, params=params, headers=headers)
    return r.json()['access_token']
