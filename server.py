import requests
import flask
import json

app = flask.Flask(__name__)

@app.route("/")
def test_endpoint():
  return "hello from flask!\n"


if __name__ == "__main__":
    app.run(debug=False, threaded=False)
