/**
 _BUILDING_DATA: If you're building a data set using responses, enable this! [T/F]
 _MAX_LENGTH:    The maximum length a user may input.                        [Character Length]
 _TEMPERATURE:   The variance level of the model response. Recommended as 0. [Level of variance, 0=Min,100=Max]
**/
const _BUILDING_DATA = true;
const _MAX_LENGTH    =  250;


//STC = Server To Client
//CTS = Client to Server



/** INCLUDES **/
const { Configuration, OpenAIApi } = require("openai");
const express = require('express');
const fs = require('fs');

/** GLOBALS **/
const app = express();//Import all components of express
const http = require('http').Server(app);//Import server component of http
const io = require('socket.io')(http);//socket :D

// Build openai config with key
const configuration = new Configuration({
	apiKey: process.env['openai'],
});
const openai = new OpenAIApi(configuration);


/** NATURAL LANGUAGE CHECKING + OPENAI SOLUTION GENERATION **/
// Verify if a prompt is valid, and reason why if not
async function isFormulaPrompt(_inputText) {
	// Verify the prompt
	let isValidPrompt = await openai.createCompletion({
		model: "text-davinci-003",
		prompt: "Is it possible \"Make an Excel formula that '" + _inputText + "'\"? In JSON form, return \"Possible\" (true/false boolean) and \"Reason\" (string). ",
		temperature: 0,
		max_tokens: 150,
	});

	// Parse the response
	let result = JSON.parse(isValidPrompt.data.choices[0].text);

	// Log and return the result
	console.log(result["Possible"] + " because " + result["Reason"]);
	return result;
}
// Generate a formula (Will work with GPT3, but use the included data to train a better model!)
async function generateFormula(_inputText, _userSocketID) {
	// Check if the prompt is a valid one
	let shouldComputeFormula = await isFormulaPrompt(_inputText);
	if (!shouldComputeFormula["Possible"]) {
		io.to(_userSocketID).emit('STC_InvalidPrompt', {
			reason: shouldComputeFormula["Reason"],
		});
		return;
	}

	// Generate the two formulas
	let generatedSolution = await openai.createCompletion({
		model: "text-davinci-003",
		prompt: "Write an Excel Formula that " + _inputText + ", as well as the Google Sheets equivalent. In JSON form, return \"ExcelFormula\" (string) and \"GoogleSheetsFormula\" (string). Don't forget the curly brackets!",
		temperature: 0,
		max_tokens: 200,
	});

	//Parse the result
	let result = JSON.parse(generatedSolution.data.choices[0].text);

	//  Return the result
	io.to(_userSocketID).emit('STC_Solution', {
		excelSolution: result["ExcelFormula"],
		googleSheetsSolution: result["GoogleSheetsFormula"],
	});

	// Log result
	if (_BUILDING_DATA) {
		// Make the data safe to store in JSONL format
		let safeData = JSON.stringify(JSON.parse(generatedSolution.data.choices[0].text));
		safeData = safeData.replace(/\n/g, "");
		safeData = safeData.replace(/\x22/g, '\\\x22');

		// Log it
		fs.appendFileSync(__dirname + '/data.jsonl', "\n{\"prompt\":\"" + _inputText + "\",\"completion\":\"" + safeData + "\"}", () => { });
	}
}

/** SERVING **/
// Make public files available
app.use('/public', express.static(__dirname + '/public'));
// Serve pages
app.get('/', function(req, res) {
	res.sendFile(__dirname + '/public/pages/index.html');
});
app.get('/about', function(req, res) {
	res.sendFile(__dirname + '/public/pages/about.html');
});
app.get('/pricing', function(req, res) {
	res.sendFile(__dirname + '/public/pages/pricing.html');
});
app.get('/login', function(req, res) {
	res.sendFile(__dirname + '/public/pages/login.html');
});
app.get('/register', function(req, res) {
	res.sendFile(__dirname + '/public/pages/register.html');
});

/** SOCKET/CLIENT HANDLING **/
io.on('connection', function(socket) {
	console.log('\nA user connected, ID: ' + socket.id);

	// On request for solution
	socket.on('CTS_RequestSolution', function(data) {
		// Log the request
		console.log('>' + data.request);

		// Check if it's too long
		if (data.request.length > _MAX_LENGTH) {
			io.to(socket.id).emit('STC_InvalidPrompt', {
				reason: "Too long!",
			});
			return;
		}

		// Try to generate a formula
		try {
			generateFormula(data.request, socket.id);
		} catch (e) {
			fs.appendFileSync(__dirname + '/log.txt', "------" + e + "\n" + data.request, () => { });
		}
	});
	// On disconnect
	socket.on('disconnect', function() {
		console.log('ID ' + socket.id + ' disconnected.');
	});
});

http.listen(3000, function() {
	console.log('listening on *:3000 ' + __dirname);
});