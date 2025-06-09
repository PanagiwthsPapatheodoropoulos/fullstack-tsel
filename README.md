# Required Setup
1. Node.js (v16 or higher)
2. MySQL Server (v8.0 or higher)
3. npm (Node Package Manager)


# Sensitive Data
> ⚠️Στο `.env` αρχείο θα βρείτε ευαίσθητα δεδομένα που πρέπει να αλλάξετε για το δικό σας περιβάλλον.


# Installation Commands
```bash
npm install
npm install bcrypt
npm install multer bcrypt
npm install express-session
npm install dotenv
```


# Start Application
```bash
npm start
``` 

# NOTE
The site works only on localhost.Might deploy later

# For public results
run the sql command
```sql
UPDATE application_periods 
SET is_active = ,
    end_date = '2025-06-15 00:00:00'
WHERE id > 0;
```
