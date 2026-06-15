const router = require("express").Router();
const { getPublicStats } = require("../controllers/statsController");

router.get("/public", getPublicStats);

module.exports = router;
