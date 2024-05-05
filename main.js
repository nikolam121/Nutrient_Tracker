import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js';
import { getAuth, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';
import { getFirestore, doc, setDoc, deleteDoc, collection, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAQWHFj2BSUyljt0Yzs2kraD2sqzuWl0r4",
    authDomain: "calorie-tracker-86995.firebaseapp.com",
    projectId: "calorie-tracker-86995",
    storageBucket: "calorie-tracker-86995.appspot.com",
    messagingSenderId: "90649163295",
    appId: "1:90649163295:web:d77755462ee0d542d6072a"
};
const firebaseApp = initializeApp(firebaseConfig);

const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// Sign out event listener
document.getElementById('signout-btn').addEventListener('click', function () {
    signOut(auth).then(() => {
        console.log('User signed out');
        document.getElementById('signout-btn').style.display = 'none';
        document.getElementById('login-signup').style.display = 'block'; // Show login/signup button
    }).catch((error) => {
        console.error('Error signing out:', error);
    });
});

// Document ready event listener
document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('search-input');
    const gramInput = document.getElementById('gram-input');
    const autocompleteList = document.getElementById('autocomplete-list');
    const foodList = document.getElementById('selected-foods');
    const searchForm = document.getElementById('search-form');
    const appId = 'f0dfbb11'; // Edamam App ID
    const appKey = '30eaed04d58b6609932339232bc70d89'; // Edamam App Key
    let totalNutrients = {
        calories: 0,
        protein: 0,
        fat: 0,
        carbs: 0
    };

    // Function to safely access a nutrient
    function getNutrient(nutrientObj, key) {
        return nutrientObj[key] || 0;
    }

    // Function to display autocomplete results
    function displayAutocompleteResults(results) {
        autocompleteList.innerHTML = '';
        results.forEach(result => {
            const listItem = document.createElement('li');
            listItem.textContent = result.food.label;
            listItem.addEventListener('click', function () {
                searchInput.value = result.food.label;
                autocompleteList.innerHTML = '';
            });
            autocompleteList.appendChild(listItem);
        });
    }

    // Input event listener for search
    searchInput.addEventListener('input', function () {
        const input = this.value.trim();
        if (!input) {
            autocompleteList.innerHTML = '';
            return;
        }

        const url = `https://api.edamam.com/api/food-database/v2/parser?app_id=${appId}&app_key=${appKey}&ingr=${encodeURIComponent(input)}`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                console.log('API Response:', data);
                autocompleteList.innerHTML = '';

                if (data.hints && data.hints.length > 0) {
                    displayAutocompleteResults(data.hints);
                } else {
                    const noResult = document.createElement('li');
                    noResult.textContent = 'No results found';
                    autocompleteList.appendChild(noResult);
                }
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                autocompleteList.innerHTML = '<li>Error fetching data</li>';
            });
    });

    // Add Food form submission event listener
    searchForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const foodName = searchInput.value.trim();
        const grams = parseFloat(gramInput.value.trim());

        if (!foodName || isNaN(grams) || grams <= 0) {
            alert('Please enter valid food and amount.');
            return;
        }

        const url = `https://api.edamam.com/api/food-database/v2/parser?app_id=${appId}&app_key=${appKey}&ingr=${encodeURIComponent(foodName)}`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.hints && data.hints.length > 0) {
                    const nutrients = data.hints[0].food.nutrients;
                    addFoodToList(foodName, grams, nutrients);
                    updateNutrientTotals(grams, nutrients); // Add the new item
                } else {
                    alert('Food not found');
                }
            })
            .catch(error => {
                console.error('Error adding food:', error);
                alert('Error adding food');
            });

        // Clear input fields
        searchInput.value = '';
        gramInput.value = '';
    });

    // Function to add food to the list
    function addFoodToList(foodItem, grams, nutrients) {
        const li = document.createElement('li');
        li.textContent = `${grams}g of ${foodItem} - Remove`;
        li.onclick = function () {
            subtractNutrientTotals(grams, nutrients); // Subtract the removed item
            removeFoodFromUserProfile(foodItem); // Remove from Firestore
            foodList.removeChild(li);
            location.reload();// Remove from the front-end list
        };
        foodList.appendChild(li);
        saveFoodDataToUserProfile(foodItem, grams, nutrients);

    }

    // Function to update nutrient totals
    function updateNutrientTotals(grams, nutrients) {
        totalNutrients.calories += (getNutrient(nutrients, 'ENERC_KCAL') * grams / 100);
        totalNutrients.protein += (getNutrient(nutrients, 'PROCNT') * grams / 100);
        totalNutrients.fat += (getNutrient(nutrients, 'FAT') * grams / 100);
        totalNutrients.carbs += (getNutrient(nutrients, 'CHOCDF') * grams / 100);

        document.getElementById('total-calories').textContent = totalNutrients.calories.toFixed(2) + ' kcal';
        document.getElementById('total-protein').textContent = totalNutrients.protein.toFixed(2) + ' g';
        document.getElementById('total-fat').textContent = totalNutrients.fat.toFixed(2) + ' g';
        document.getElementById('total-carbs').textContent = totalNutrients.carbs.toFixed(2) + ' g';
    }

    // Function to subtract nutrient totals
    function subtractNutrientTotals(grams, nutrients) {
        totalNutrients.calories -= (getNutrient(nutrients, 'ENERC_KCAL') * grams / 100);
        totalNutrients.protein -= (getNutrient(nutrients, 'PROCNT') * grams / 100);
        totalNutrients.fat -= (getNutrient(nutrients, 'FAT') * grams / 100);
        totalNutrients.carbs -= (getNutrient(nutrients, 'CHOCDF') * grams / 100);

        document.getElementById('total-calories').textContent = totalNutrients.calories.toFixed(2) + ' kcal';
        document.getElementById('total-protein').textContent = totalNutrients.protein.toFixed(2) + ' g';
        document.getElementById('total-fat').textContent = totalNutrients.fat.toFixed(2) + ' g';
        document.getElementById('total-carbs').textContent = totalNutrients.carbs.toFixed(2) + ' g';
    }

    // Function to save food data to user profile
    async function saveFoodDataToUserProfile(foodItem, grams, nutrients) {
        const user = auth.currentUser;
        if (!user) {
            alert('Please log in to save your data.');
            return;
        }

        const sanitizedFoodItem = foodItem.replace(/\//g, '-');

        const foodRef = doc(db, `users/${user.uid}/foods/${sanitizedFoodItem}`);
        try {
            await setDoc(foodRef, {
                grams: grams,
                calories: (getNutrient(nutrients, 'ENERC_KCAL') * grams / 100),
                protein: (getNutrient(nutrients, 'PROCNT') * grams / 100),
                fat: (getNutrient(nutrients, 'FAT') * grams / 100),
                carbs: (getNutrient(nutrients, 'CHOCDF') * grams / 100)
            });
            console.log('Food data saved successfully.');
        } catch (error) {
            console.error('Error saving food data:', error);
        }
    }

    // Function to remove food data from user profile
    async function removeFoodFromUserProfile(foodItem) {
        const user = auth.currentUser;
        if (!user) {
            alert('Please log in to remove your data.');
            return;
        }

        const sanitizedFoodItem = foodItem.replace(/\//g, '-');

        const foodRef = doc(db, `users/${user.uid}/foods/${sanitizedFoodItem}`);
        try {
            await deleteDoc(foodRef);
            console.log('Food data removed successfully.');
        } catch (error) {
            console.error('Error removing food data:', error);
        }
    }

    // Function to load user food data
    function loadUserFoodData(userId) {
        const userFoodsRef = collection(db, `users/${userId}/foods`);

        onSnapshot(userFoodsRef, (snapshot) => {
            foodList.innerHTML = ''; // Clear current list
            snapshot.forEach((doc) => {
                const data = doc.data();
                console.log('Food data loaded:', data);
                addFoodToList(doc.id, data.grams, data);
            });
        }, (error) => {
            console.error('Error loading food data:', error);
        });
    }

    // Auth state change event listener
    onAuthStateChanged(auth, user => {
        if (user) {
            console.log('User is logged in:', user.uid);
            loadUserFoodData(user.uid);
            document.getElementById('signout-btn').style.display = 'block';
            document.getElementById('login-signup').style.display = 'none'; // Hide login/signup button
        } else {
            console.log('User is logged out');
            document.getElementById('signout-btn').style.display = 'none';
            document.getElementById('login-signup').style.display = 'block'; // Show login/signup button
        }
    });

    // Event listener for clearing autocomplete list
    document.addEventListener('click', function (e) {
        if (e.target !== searchInput && e.target !== autocompleteList) {
            autocompleteList.innerHTML = '';
        }
    });
});
