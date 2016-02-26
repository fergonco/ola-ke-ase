define(function() {

	function uid() {
		return Math.floor(Math.random() * 100000000) + "_" + new Date().getTime();
	}
	return uid
});