import requests
import flask
import json
import datetime
import passwords

app = flask.Flask(__name__)

@app.route("/")
def test_endpoint():
  return "hello from flask!\n"

@app.route("/updateWorkouts")
def update_workouts():
  r = requests.get(
      "https://api.airtable.com/v0/appSD8cnaTlpwJwba/exercises?view=all&api_key=" + passwords.api_key())
  response = r.json()
  muscle_groups_week = {}
  muscle_groups_today = {}
  for record in response["records"]:
    for muscle in record["fields"]["muscles"]:
      if muscle not in muscle_groups_week:
        muscle_groups_week[muscle] = {}
        muscle_groups_week[muscle]["sets"] = 1
        muscle_groups_week[muscle]["intensitySum"] = record["fields"]["intensity"]
        muscle_groups_week[muscle]["averageIntensity"] = muscle_groups_week[muscle]["intensitySum"]
      else:
        muscle_groups_week[muscle]["sets"] += 1
        muscle_groups_week[muscle]["intensitySum"] += record["fields"]["intensity"]
        muscle_groups_week[muscle]["averageIntensity"] = round(
            muscle_groups_week[muscle]["intensitySum"] / muscle_groups_week[muscle]["sets"], 2)
        
  r = requests.get(
      "https://api.airtable.com/v0/appSD8cnaTlpwJwba/exercises?view=today&api_key=" + passwords.api_key())
  response = r.json()
  for record in response["records"]:
    print('here')
    for muscle in record["fields"]["muscles"]:
      if muscle not in muscle_groups_today:
          muscle_groups_today[muscle] = {}
          muscle_groups_today[muscle]["sets"] = 1
          muscle_groups_today[muscle]["intensitySum"] = record["fields"]["intensity"]
          muscle_groups_today[muscle]["averageIntensity"] = muscle_groups_today[muscle]["intensitySum"]
      else:
        muscle_groups_today[muscle]["intensitySum"] += record["fields"]["intensity"]
        muscle_groups_today[muscle]["sets"] += 1
        muscle_groups_today[muscle]["averageIntensity"] = round(muscle_groups_today[muscle]["intensitySum"] / muscle_groups_today[muscle]["sets"], 2)
          
  jsonBody = []
  daily_id_dict = {
      "shoulders": "rec0x6AiyRvfIpWHV",
      "biceps": "recLAhYKfFUzfXLAG",
      "horizontal back": "recNOc9pFelbceLIo",
      "triceps": "recWsJVrjaLfn08sE",
      "verical back": "reclEIMMpxn0lJOTd",
      "calves": "recnmxYiq6bk5k1qm",
      "quads": "recsQdkrUlIhudtoe",
      "chest": "recuBzsFjhb172ZpN",
      "core": "reczWybrvY3MRJwkn",
      "hamstrings": "recxGPObMBZnj21Dj"
  }
  weekly_id_dict = {
      "quads": "rec7dI9nFn3Kb14pR",
      "horizontal back": "recPQ7AEBk1Y3uiKI",
      "shoulders": "recRdHSl9lqJejh7u",
      "chest": "recSG9x8HTedc0MqL",
      "triceps": "recWfmas3UTLxA9sP",
      "calves": "recYHZIK96OVUu6jI",
      "vertical back": "recikwLbLy3auvlSX",
      "core": "recsaXSqGoYB5Qdkk",
      "biceps": "recuakLo1B1WtGwOY",
      "hamstrings": "recW6xo1SEfS72FkF"
  }
  for muscle in muscle_groups_week:
    jsonBody.append({
      "id": weekly_id_dict[muscle],
      "fields": {
        "muscle": muscle,
        "numSets": muscle_groups_week[muscle]["sets"],
        "averageIntensity": muscle_groups_week[muscle]["averageIntensity"]
      }
    })
  if len(jsonBody) != 0:
    body = {"records": jsonBody}
    r = requests.patch(
        "https://api.airtable.com/v0/appSD8cnaTlpwJwba/weekly-summary?&api_key=" + passwords.api_key(), json=body)
  
  jsonBody = []
  for muscle in muscle_groups_today:
    jsonBody.append({
        "id": daily_id_dict[muscle],
        "fields": {
            "muscle": muscle,
            "numSets": muscle_groups_today[muscle]["sets"],
            "averageIntensity": muscle_groups_today[muscle]["averageIntensity"]
        }
    })
  if len(jsonBody) != 0:
    body = {"records": jsonBody}
    r = requests.patch(
        "https://api.airtable.com/v0/appSD8cnaTlpwJwba/daily-summary?&api_key=" + passwords.api_key(), json=body)
    #print(r.text)
  return("done")

if __name__ == "__main__":
  app.run(debug=False, threaded=False)
  #update_workouts()
