var socket = io();
console.log('hihihih');
$(document).ready(function(){
	/**
	$('#inputbox').on('input', function() {
    console.log('hihihi');
		socket.emit('CTS_RequestSolution',{request:$('#inputbox').val()});
	});
	**/
	$('#submit').click(function() {
    console.log('hihihi');
		socket.emit('CTS_RequestSolution',{request:$('#inputbox').val()});
		$('#waiting').html("Generating...");
		
		$('#excelSolution').html("");
		$('#googleSheetsSolution').html("");
	});
});
socket.on('STC_Solution', function(data) {
	console.log('yooooooooo!');
	$('#excelSolution').html("Excel Formula: \"" + data.excelSolution + "\"");
	$('#googleSheetsSolution').html("Google Sheets Formula: \"" + data.googleSheetsSolution + "\"");
	
	$('#error').html("");
	$('#waiting').html("");
});
socket.on('STC_InvalidPrompt', function(data) {
	console.log('wtf ur shit guy');
	$('#error').html("Please give a more understandable input!<br>" + data.reason);
	
	$('#waiting').html("");
	$('#excelSolution').html("");
	$('#googleSheetsSolution').html("");
});