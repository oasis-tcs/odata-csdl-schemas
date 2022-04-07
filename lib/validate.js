try {
	require("odata-abnf/lib/validate");
} catch(e) {
	process.stdin.pipe(process.stdout);
}
