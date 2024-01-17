export const styles = `
body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 0;
}

main {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  color: #333;
}

a {
  color: #0066cc;
}

.errors {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.errors:empty {
  display: none;
}

p.error {
  display: block;
  padding: 10px;
  background-color: #ffcccc;
  color: #cc0000;
}

.form-control {
  margin-bottom: 10px;
  width: 100%;
}

label {
  display: block;
  margin-bottom: 5px;
}

input {
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 5px;
}

button[type="submit"] {
  padding: 10px 20px;
  background-color: #0066cc;
  color: #fff;
  border: none;
}
`;
