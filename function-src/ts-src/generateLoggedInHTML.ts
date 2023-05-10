export function generateLoggedInHTML() {
    const hmtl = `
<!DOCTYPE html>
<html>
<body>

<h1>Authentication Success</h1>
<p>You are now authenticated with Google.  Go back to Slack and type /meet again to create your meeting.</p>

</body>
</html>
    `;
    return hmtl;
}
