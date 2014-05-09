import ConfigParser
import os
import requests

import flask

from ConfigParser import NoSectionError, NoOptionError
from flask import Flask, Response, render_template, send_from_directory, request, session, redirect

# App initialization
app = Flask(__name__, static_url_path='/static')
app.config.update(
    DEBUG = True,
)

def github_oauth(code):
    """ Fetch and return user token
    """
    params = {}
    params['client_id'] = app.github.get('client_id')
    params['client_secret'] = app.github.get('client_secret')
    params['code'] = code

    headers={'Accept': 'application/json'}

    gh_oauth_get_token = 'https://github.com/login/oauth/access_token'
    r = requests.post(gh_oauth_get_token, params=params, headers=headers)
    if r.status_code != requests.codes.OK:
        return r.json()['access_token']
    else:
        return 'unavailable'

@app.route('/oauth')
def do_oauth():
    """ Performs GitHub OAuth2 protocol
    """
    token = session.get('token', None)
    if not token or token=='unavailable':
        # code parameter will be returned by GitHub in Step 1 of OAuth2 authentication
        code = request.args.get('code', None)
        if not code:
            redirect_uri = 'https://github.com/login/oauth/authorize?client_id={}&scopes=user,repo'.format(app.github.get('client_id'))
            return redirect(redirect_uri)
        else:
            token = github_oauth(code)
            session['token'] = token
    return redirect('/')

@app.route('/token')
def get_user_token():
    """ Return user token
    """
    return flask.jsonify({'access_token': session.get('token', '')})

###############
# controllers #
###############
@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'), 'ico/favicon.ico')

@app.route('/js/<path:path>')
def static_proxy(path):
    mime = 'application/javascript'
    return Response(app.send_static_file(os.path.join('js', path)), mime)

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.route("/")
def index():
    return render_template('index.html')


if __name__ == "__main__"  :
    example_config = """
    [GitHub]
    client_id = <your client id>
    client_secret = <your client secret>
    """  
    config_file = os.path.join(os.environ['HOME'], '.commitatorrc')
    if os.path.exists(config_file):
        conf = ConfigParser.SafeConfigParser()
        conf.read(config_file);
        try:
            port = int(os.environ.get("PORT", 5000))
            app.secret_key = os.urandom(24)
            app.github = {}
            app.github['client_id'] = conf.get('GitHub', 'client_id')
            app.github['client_secret'] = conf.get('GitHub', 'client_secret')
            app.run(host='0.0.0.0', port=port)
        except (NoSectionError, NoOptionError) as e:
            print "Malformed configuration file, please follow this structure for " + \
            "your configuration file, which should be located in $HOME/.commitatorrc:" + '\n' + \
            example_config
            raise e
    else:
        raise RuntimeError("Please create a ~/.commitatorrc configuration file for the application")