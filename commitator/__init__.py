"""Commitator main module
"""
import os
import ConfigParser

###############
# GitHub URIs #
###############

# Global
GH_BASE = 'https://api.github.com'
ACCESS_TOKEN = None

# Organization level
GH_ORG = GH_BASE + '/orgs/{org}'
GH_ORG_REPOS = GH_ORG + '/repos'
GH_ORG_MEMBERS = GH_ORG + '/public_members'

# Repository level
GH_REPOS = GH_BASE + '/repos'
GH_REPO = GH_REPOS + '/{user}/{repo}'
GH_REPO_COMMITS = GH_REPO + '/commits'

# OAuth
GH_OATUH_AUTHORIZE = 'https://github.com/login/oauth/authorize'
GH_OATUH_GET_TOKEN = 'https://github.com/login/oauth/access_token'


# If available, read GH token
config_file = os.path.join(os.environ['HOME'], '.commitatorrc')
if os.path.exists(config_file):
    conf = ConfigParser.SafeConfigParser()
    conf.read(config_file);
    ACCESS_TOKEN = conf.get('GitHub', 'access_token')
    CLIENT_ID = conf.get('GitHub', 'client_id')
    CLIENT_SECRET = conf.get('GitHub', 'client_secret')
