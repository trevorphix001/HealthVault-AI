// ============================================================
// HealthVault AI — app.js
// ============================================================

const $ = (sel, root = document) =>
    root.querySelector(sel);


const $$ = (sel, root = document) =>
    Array.from(root.querySelectorAll(sel));


const STORAGE_KEY =
    "healthvault_user_id";


// =========================
// USER / PATIENT ID
// =========================

function getCurrentUserId() {

    return localStorage.getItem(
        STORAGE_KEY
    );
}


function setCurrentUserId(id) {

    localStorage.setItem(
        STORAGE_KEY,
        id
    );
}


function clearCurrentUserId() {

    localStorage.removeItem(
        STORAGE_KEY
    );
}


function signOut() {

    clearCurrentUserId();

    window.location.href =
        "index.html";
}


function requireUser() {

    const id =
        getCurrentUserId();


    if (!id) {

        window.location.href =
            "index.html";

        return null;
    }


    return id;
}


// =========================
// AGE CALCULATOR
// =========================

function calcAge(dobStr) {

    if (!dobStr)
        return "—";


    const dob =
        new Date(dobStr);


    return Math.floor(
        (
            Date.now() -
            dob.getTime()
        ) /
        (
            1000 *
            60 *
            60 *
            24 *
            365.25
        )
    );
}


// =========================
// URL QUERY PARAMETER
// =========================

function getQueryParam(name) {

    return new URLSearchParams(
        window.location.search
    ).get(name);
}


// =========================
// STATUS PILL
// =========================

function statusPillHTML(status) {

    const s =
        (status || "unknown")
            .toLowerCase();


    return `
        <span class="status-pill status-${s}">
            ${status || "unknown"}
        </span>
    `;
}