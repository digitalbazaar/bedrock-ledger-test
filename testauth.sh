curl -i \
  -H "Content-Type: application/json" \
  -d '
{ "auth": {
    "identity": {
      "methods": ["password"],
      "password": {
        "user": {
          "name": "mcollier",
          "domain": { "id": "default" },
          "password": "foo"
        }
      }
    },
    "scope": {
      "project": {
        "name": "veres-delta-stress",
        "domain": { "id": "default" }
      }
    }
  }
}' \
  "http://controller:5000/v3/auth/tokens" ; echo
