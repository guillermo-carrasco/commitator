import os
import flask
from flask import Flask, Response, render_template, send_from_directory, request

from commitator import GitHub_utils

# initialization
app = Flask(__name__, static_url_path='/static')
app.config.update(
    DEBUG = True,
)

#############
# API calls #
#############
@app.route('/api/org/commits', methods=['GET'])
def det_org_repos():
  """Return a JSON file with a summary of commits per repository within

  the organization
  """
  org = request.args.get('org', '')
  since = request.args.get('since', False)
  until = request.args.get('until', False)
  return flask.jsonify(GitHub_utils.get_commits_org(org, since, until))

# controllers
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

# launch
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
