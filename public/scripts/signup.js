handleSignup = async(e) => {
    e.preventDefault();

    const data = {
        firstName: document.getElementById('firstname').value,
        lastName: document.getElementById('lastname').value,
        studentId: document.getElementById('reg_number').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
        confirmPassword: document.getElementById('confirm_password').value
    }

    try{
        const response = await fetch('http://localhost:3000/auth/signup',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        if(response.ok){
            alert(result.message);
            window.location.href = 'login.html';
        }
        else{
            alert(result.message || result.error);
        }
    }
    catch(error) {
        alert('Σφάλμα κατά την εγγραφή')
    }
    
    return false;
}

// imhor1zon 123papathe!
//GKOTSIGANG 123pap!
// admin admin123!