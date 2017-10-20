/* globals db */
db = db.getSiblingDB('ledger_test_primary');
db = db.getSiblingDB('ledger_test_secondary');
db.dropDatabase();
