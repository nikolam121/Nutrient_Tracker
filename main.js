import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js';
import { getAuth, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';
import {
    getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';
import { firebaseConfig, edamam } from './config.js';

const GUEST_STORAGE_KEY = 'calorie-tracker-guest-entries';
const SEARCH_DEBOUNCE_MS = 300;
const MAX_SUGGESTIONS = 8;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const searchInput = document.getElementById('search-input');
const gramInput = document.getElementById('gram-input');
const autocompleteList = document.getElementById('autocomplete-list');
const foodList = document.getElementById('selected-foods');
const searchForm = document.getElementById('search-form');
const addBtn = document.getElementById('add-btn');
const emptyState = document.getElementById('empty-state');
const formMessage = document.getElementById('form-message');
const guestNotice = document.getElementById('guest-notice');
const userEmail = document.getElementById('user-email');
const loginBtn = document.getElementById('login-signup');
const signoutBtn = document.getElementById('signout-btn');
const totalCalories = document.getElementById('total-calories');
const totalProtein = document.getElementById('total-protein');
const totalFat = document.getElementById('total-fat');
const totalCarbs = document.getElementById('total-carbs');

let entries = [];
let currentUser = null;
let unsubscribeEntries = null;
let selectedFood = null;
let searchTimer = null;

function loadGuestEntries() {
    try {
        const stored = JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY));
        return Array.isArray(stored) ? stored : [];
    } catch (error) {
        return [];
    }
}

function saveGuestEntries() {
    try {
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
        console.error('Could not save entries locally:', error);
    }
}

function clearGuestEntries() {
    try {
        localStorage.removeItem(GUEST_STORAGE_KEY);
    } catch (error) {
        console.error('Could not clear local entries:', error);
    }
}

function macrosFor(nutrients, grams) {
    const per100g = key => Number(nutrients?.[key]) || 0;
    return {
        calories: per100g('ENERC_KCAL') * grams / 100,
        protein: per100g('PROCNT') * grams / 100,
        fat: per100g('FAT') * grams / 100,
        carbs: per100g('CHOCDF') * grams / 100
    };
}

function showMessage(text, isError = false) {
    formMessage.textContent = text;
    formMessage.classList.toggle('message--error', isError);
    formMessage.hidden = !text;
}

function closeAutocomplete() {
    autocompleteList.replaceChildren();
    autocompleteList.hidden = true;
    searchInput.setAttribute('aria-expanded', 'false');
}

function buildEntryElement(entry) {
    const li = document.createElement('li');
    li.className = 'foods__item';

    const name = document.createElement('span');
    name.className = 'foods__name';
    name.textContent = `${entry.grams}g ${entry.name}`;

    const macros = document.createElement('span');
    macros.className = 'foods__macros';
    macros.textContent = `${Math.round(entry.calories)} kcal · ${entry.protein.toFixed(1)}p · ` +
        `${entry.fat.toFixed(1)}f · ${entry.carbs.toFixed(1)}c`;

    const info = document.createElement('div');
    info.className = 'foods__info';
    info.append(name, macros);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn btn--remove';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', `Remove ${entry.name}`);
    remove.addEventListener('click', () => removeEntry(entry.id));

    li.append(info, remove);
    return li;
}

function render() {
    foodList.replaceChildren(...entries.map(buildEntryElement));
    emptyState.hidden = entries.length > 0;

    const totals = entries.reduce((sum, entry) => ({
        calories: sum.calories + entry.calories,
        protein: sum.protein + entry.protein,
        fat: sum.fat + entry.fat,
        carbs: sum.carbs + entry.carbs
    }), { calories: 0, protein: 0, fat: 0, carbs: 0 });

    totalCalories.textContent = Math.round(totals.calories);
    totalProtein.textContent = totals.protein.toFixed(1);
    totalFat.textContent = totals.fat.toFixed(1);
    totalCarbs.textContent = totals.carbs.toFixed(1);
}

function toFirestoreDoc(entry) {
    return {
        name: entry.name,
        grams: entry.grams,
        calories: entry.calories,
        protein: entry.protein,
        fat: entry.fat,
        carbs: entry.carbs,
        createdAt: Date.now()
    };
}

async function addEntry(name, grams, nutrients) {
    const entry = { name, grams, ...macrosFor(nutrients, grams) };

    if (currentUser) {
        await addDoc(collection(db, `users/${currentUser.uid}/foods`), toFirestoreDoc(entry));
    } else {
        entries = [...entries, { ...entry, id: crypto.randomUUID(), createdAt: Date.now() }];
        saveGuestEntries();
        render();
    }
}

async function removeEntry(id) {
    if (currentUser) {
        try {
            await deleteDoc(doc(db, `users/${currentUser.uid}/foods/${id}`));
        } catch (error) {
            console.error('Error removing food:', error);
            showMessage('Could not remove that item. Please try again.', true);
        }
    } else {
        entries = entries.filter(entry => entry.id !== id);
        saveGuestEntries();
        render();
    }
}

async function searchFoods(term) {
    const url = `${edamam.parserUrl}?app_id=${edamam.appId}&app_key=${edamam.appKey}&ingr=${encodeURIComponent(term)}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Food API returned ${response.status}`);
    }

    const data = await response.json();
    return data.hints || [];
}

function buildSuggestionElement(hint) {
    const item = document.createElement('li');
    item.className = 'autocomplete__item';
    item.setAttribute('role', 'option');
    item.tabIndex = 0;
    item.textContent = hint.food.label;

    const choose = () => {
        selectedFood = hint.food;
        searchInput.value = hint.food.label;
        closeAutocomplete();
        gramInput.focus();
    };

    item.addEventListener('click', choose);
    item.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            choose();
        }
    });

    return item;
}

function renderAutocomplete(hints) {
    if (hints.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'autocomplete__empty';
        empty.textContent = 'No matches found';
        autocompleteList.replaceChildren(empty);
    } else {
        autocompleteList.replaceChildren(
            ...hints.slice(0, MAX_SUGGESTIONS).map(buildSuggestionElement)
        );
    }

    autocompleteList.hidden = false;
    searchInput.setAttribute('aria-expanded', 'true');
}

function watchUserEntries(uid) {
    return onSnapshot(collection(db, `users/${uid}/foods`), snapshot => {
        entries = snapshot.docs
            .map(snap => {
                const data = snap.data();
                return {
                    id: snap.id,
                    name: data.name ?? snap.id,
                    grams: Number(data.grams) || 0,
                    calories: Number(data.calories) || 0,
                    protein: Number(data.protein) || 0,
                    fat: Number(data.fat) || 0,
                    carbs: Number(data.carbs) || 0,
                    createdAt: Number(data.createdAt) || 0
                };
            })
            .sort((a, b) => a.createdAt - b.createdAt);
        render();
    }, error => {
        console.error('Error loading food data:', error);
        showMessage('Could not load your saved food. Check your connection and refresh.', true);
    });
}

async function migrateGuestEntries(uid) {
    const pending = loadGuestEntries();
    if (pending.length === 0) {
        return;
    }

    clearGuestEntries();

    for (const entry of pending) {
        try {
            await addDoc(collection(db, `users/${uid}/foods`), toFirestoreDoc(entry));
        } catch (error) {
            console.error('Error moving local entry to your account:', error);
        }
    }
}

searchInput.addEventListener('input', function () {
    selectedFood = null;
    clearTimeout(searchTimer);

    const term = this.value.trim();
    if (!term) {
        closeAutocomplete();
        return;
    }

    searchTimer = setTimeout(async () => {
        try {
            renderAutocomplete(await searchFoods(term));
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            closeAutocomplete();
        }
    }, SEARCH_DEBOUNCE_MS);
});

searchInput.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        closeAutocomplete();
    }
});

searchForm.addEventListener('submit', async event => {
    event.preventDefault();
    showMessage('');
    closeAutocomplete();

    const foodName = searchInput.value.trim();
    const grams = parseFloat(gramInput.value);

    if (!foodName) {
        showMessage('Enter a food to add.', true);
        return;
    }

    if (!Number.isFinite(grams) || grams <= 0) {
        showMessage('Enter an amount in grams greater than zero.', true);
        return;
    }

    addBtn.disabled = true;
    addBtn.textContent = 'Adding...';

    try {
        const food = selectedFood ?? (await searchFoods(foodName))[0]?.food;

        if (!food) {
            showMessage(`No nutrition data found for "${foodName}".`, true);
            return;
        }

        await addEntry(food.label, grams, food.nutrients);

        searchInput.value = '';
        gramInput.value = '';
        selectedFood = null;
        searchInput.focus();
    } catch (error) {
        console.error('Error adding food:', error);
        showMessage('Something went wrong adding that food. Please try again.', true);
    } finally {
        addBtn.disabled = false;
        addBtn.textContent = 'Add';
    }
});

document.addEventListener('click', event => {
    if (!searchForm.contains(event.target)) {
        closeAutocomplete();
    }
});

loginBtn.addEventListener('click', () => {
    window.location.href = 'auth.html';
});

signoutBtn.addEventListener('click', () => {
    signOut(auth).catch(error => {
        console.error('Error signing out:', error);
        showMessage('Could not sign out. Please try again.', true);
    });
});

onAuthStateChanged(auth, async user => {
    unsubscribeEntries?.();
    unsubscribeEntries = null;
    currentUser = user;

    userEmail.textContent = user?.email ?? '';
    userEmail.hidden = !user;
    signoutBtn.hidden = !user;
    loginBtn.hidden = Boolean(user);
    guestNotice.hidden = Boolean(user);

    if (user) {
        entries = [];
        render();
        unsubscribeEntries = watchUserEntries(user.uid);
        await migrateGuestEntries(user.uid);
    } else {
        entries = loadGuestEntries();
        render();
    }
});

entries = loadGuestEntries();
render();
