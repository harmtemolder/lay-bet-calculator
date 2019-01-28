// laybetcalc.js

// Load requirements
const fs = require("fs");
const express = require("express");
const bodyParser = require("body-parser");
const Handlebars = require("handlebars");
const app = express();
const port = 3000;

// Add functionality to parse a POST request's body
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));

// Add equals helper to Handlebars
Handlebars.registerHelper('equals', function(v1, v2, options) {
  if (v1 === v2) {
    return options.fn(this);
  }
  return options.inverse(this);
});

// Read the form's HTML from file
const htmlFile = "./laybetcalc.html";
console.log("laybetcalc: Reading HTML from file (" + htmlFile + ")...");
let htmlSource = fs.readFileSync(htmlFile, "utf-8");
var htmlTemplate = Handlebars.compile(htmlSource);

app.get('/', function (req, res) {
  console.log("laybetcalc: Serving HTML as response to GET request...");
  context = {};
  res.send(htmlTemplate(context));
});

app.post('/', function (req, res) {
  console.log("laybetcalc: Handling POST request...");
  var context = req.body;

  // Calculate optimal exchangeStake based on context
  context["exchangeStake"] = calcLayStake(context);

  res.send(htmlTemplate(context));
});

app.listen(port, function () {
  console.log(`laybetcalc: Listening on port ${port}...`);
});

function calcLayStake(input) {
  // TODO Integrate input.exchangePromotion when it arises

  var maxTime = 30000; // ms
  var count = 0;
  var maxCount = parseFloat(input.bookmakerStake) * 1000;

  // Start off with the same stake on both the exchange and the bookmaker
  var exchangeStake = parseFloat(input.bookmakerStake);
  var winnings = calcWinnings(
    parseFloat(input.bookmakerOdds),
    parseFloat(input.bookmakerStake),
    parseFloat(input.bookmakerPromotion ? input.bookmakerPromotion : false),
    parseFloat(input.exchangeOdds),
    exchangeStake,
    parseFloat(input.exchangePromotion ? input.exchangePromotion : false),
    parseFloat(input.exchangeCommission)
  );
  console.log("laybetcalc/calcLayStake: exchangeStake = " + exchangeStake + ", winnings.win = " + winnings.win + ", winnings.lose = " + winnings.lose);

  // Now optimize minWinnings by manipulating exchangeStake
  while (!(winnings.win === winnings.lose) && count <= maxCount) {
    // TODO Write a proper optimization algorithm to do this
    // TODO Add timer to break loop with option to set num seconds in form
    if (winnings.win < winnings.lose) {
      // If winnings.win is too high, decrease exchangeStake
      exchangeStake = exchangeStake - 0.01;
      var winnings = calcWinnings(
        parseFloat(input.bookmakerOdds),
        parseFloat(input.bookmakerStake),
        input.bookmakerPromotion ? input.bookmakerPromotion : false,
        parseFloat(input.exchangeOdds),
        exchangeStake,
        input.exchangePromotion ? input.exchangePromotion : false,
        parseFloat(input.exchangeCommission)
      );
    } else {
      // If winnings.win is too low, increase exchangeStake
      exchangeStake = exchangeStake + 0.01;
      var winnings = calcWinnings(
        parseFloat(input.bookmakerOdds),
        parseFloat(input.bookmakerStake),
        parseFloat(input.bookmakerPromotion ? input.bookmakerPromotion : false),
        parseFloat(input.exchangeOdds),
        exchangeStake,
        parseFloat(input.exchangePromotion ? input.exchangePromotion : false),
        parseFloat(input.exchangeCommission)
      );
    }
    console.log("laybetcalc/calcLayStake: exchangeStake = " + exchangeStake + ", winnings.win = " + winnings.win + ", winnings.lose = " + winnings.lose);
    count++;
  }

  return exchangeStake;
}

function calcWinnings(bookmakerOdds, bookmakerStake, bookmakerPromotion, exchangeOdds, exchangeStake, exchangePromotion, exchangeCommission) {
  // Since exchangeCommission is entered in percentage, divide by 100
  exchangeCommission = exchangeCommission / 100

  // Calculate the liability on the exchange
  var exchangeLiability = (1 - exchangeOdds) * exchangeStake;

  // Calculate the total winnings if the bookmaker bet wins
  var winBookmakerWinnings = (bookmakerOdds - 1) * bookmakerStake;
  var winExchangeLoss = exchangeLiability;
  var winWinnings = winBookmakerWinnings + winExchangeLoss;

  // Calculate the total winnings if the exchange bet wins
  if (bookmakerPromotion && bookmakerPromotion == "free bet") {
    var loseBookmakerLoss = 0;
  } else {
    var loseBookmakerLoss = -bookmakerStake;
  }
  var loseExchangeWinnings = exchangeStake * (1 - exchangeCommission);
  var loseWinnings = loseBookmakerLoss + loseExchangeWinnings;

  return {"win": winWinnings, "lose": loseWinnings};
}
