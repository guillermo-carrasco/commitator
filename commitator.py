import os
from flask import Flask, Response, render_template, send_from_directory

from commitator import *

# initialization
app = Flask(__name__, static_url_path='/static')
app.config.update(
    DEBUG = True,
)

#############
# API calls #
#############
@app.route('/api/repos')
def det_org_repos(org):
  """Return a JSON file with information of the organization's repositories
  """

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
