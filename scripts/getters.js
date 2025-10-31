// getters.js (parcheado)

// --- funciones anteriores (sin cambios) ---
async function isAC(problemId, userID) {
    // Search for an AC submission
    let problem_submissions_url = "https://aceptaelreto.com/ws/user/${userID}/submissions/problem/${problemId}";
    problem_submissions_url = problem_submissions_url.replace("${userID}", userID);
    problem_submissions_url = problem_submissions_url.replace("${problemId}", problemId);
    
    let request = await fetch(problem_submissions_url);
    let submissions = await request.json();

    do {
        // Loop through the submissions and check for an AC submission
        for (const submission of submissions.submission) {
            if (submission.result === "AC") {
                return true;
            }
        }

        // If there are no next link (undefined), break the loop
        if (submissions.nextLink === undefined) {
            break;
        }
        console.log("Next link: " + submissions.nextLink);
        // Get the next page of submissions
        request = await fetch(submissions.nextLink);
        submissions = await request.json();
    } while (submissions.submission.length > 0); //If there are no submissions, break the loop
    return false;
}

async function isTried(problemId, userID) {
    // Search for an AC submission
    let problem_submissions_url = "https://aceptaelreto.com/ws/user/${userID}/submissions/problem/${problemId}";
    problem_submissions_url = problem_submissions_url.replace("${userID}", userID);
    problem_submissions_url = problem_submissions_url.replace("${problemId}", problemId);
    
    const request = await fetch(problem_submissions_url);
    const submissions = await request.json();

    return submissions.submission.length !== 0;
}

async function isCategoryCompleted(categoryId, userID) {
    if (await isProblemsCategory(categoryId) === false) {
        let category_categories_url = "https://aceptaelreto.com/ws/cat/${categoryId}/?md=1";
        category_categories_url = category_categories_url.replace("${categoryId}", categoryId);
        const request = await fetch(category_categories_url);
        const category_data = await request.json();
        if (category_data.subcats.length > 0) {
            for (const subcat of category_data.subcats) {
                const completed = await isCategoryCompleted(subcat.id, userID);
                if (completed === false) {
                    return false;
                }
            }
        }
        return true;
    }
    else {
        let category_problems_url = "https://aceptaelreto.com/ws/cat/${categoryId}/problems";
        category_problems_url = category_problems_url.replace("${categoryId}", categoryId);
        const request = await fetch(category_problems_url);
        let problem_list = await request.json();
        let problems = problem_list.problem;

        if (problems.length > 0) {
            const chunkSize = 20;
            for (let i = 0; i < problems.length; i += chunkSize) {
                const chunk = problems.slice(i, i + chunkSize);
                const promises = chunk.map(problem => isAC(problem.num, userID));
                const results = await Promise.all(promises);
                if (results.some(result => result === false)) {
                    return false;
                }
            }
            return true;
        }
        else {
            return false;
        }
    }
}

async function isVolumeCompleted(volumeId, userID) {
    let volume_problems_url = "https://aceptaelreto.com/ws/volume/${volumeId}/problems";
    volume_problems_url = volume_problems_url.replace("${volumeId}", volumeId);
    const request = await fetch(volume_problems_url);
    let problem_list = await request.json();

    let problems = problem_list.problem;

    if (problems.length > 0) {
        const chunkSize = 20;
        for (let i = 0; i < problems.length; i += chunkSize) {
            const chunk = problems.slice(i, i + chunkSize);
            const promises = chunk.map(problem => isAC(problem.num, userID));
            const results = await Promise.all(promises);
            if (results.some(result => result === false)) {
                return false;
            }
        }
        return true;
    }
    else {
        return false;
    }
}

async function getUserID(username) {
    // console.log("New username: " + username);
    const baseSearchUrl = "https://aceptaelreto.com/bin/search.php?search_query=${username}&commit=searchUser&search_currentPage=%2Fuser%2Fprofile.php";
    let url = baseSearchUrl.replace("${username}", username);
    
    //We need to make a request to the url
    const request = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow'
    });

    //Get the user ID
    const finalUrl = request.url;
    // console.log("Final URL: " + finalUrl);
    let userID = finalUrl.split("id=")[1];

    return userID;
}

async function getNick(acrsession, ACR_session) {
    const profile_url = "https://aceptaelreto.com/user/profile.php";
    const request = await fetch(profile_url, {
        method: 'GET',
        headers: {
            'Cookie': 'acrsession=' + acrsession
                + '; ACR_SessionCookie=' + ACR_session

        }
    });

    // Look for the nickname in the HTML
    // The nickname is in a p inside a div following a label with text "Nick"
    const text = await request.text();
    
    // Use RegExp to find the nickname
    const regex = /<label[^>]*>\s*Nick\s*<\/label>\s*<div[^>]*>\s*<p[^>]*>([^<]*)<\/p>/i;
    const match = text.match(regex);
    return match ? match[1] : null;
}

async function getLastError(problemId, userID) {
    // Get the last submission
    let problem_submissions_url = "https://aceptaelreto.com/ws/user/${userID}/submissions/problem/${problemId}";
    problem_submissions_url = problem_submissions_url.replace("${userID}", userID);
    problem_submissions_url = problem_submissions_url.replace("${problemId}", problemId);

    const request = await fetch(problem_submissions_url);
    const submissions = await request.json();
    // console.log(submissions.submission[0].result);
    return submissions.submission[0].result;
}

// Not testeable function, depends on chrome.storage
async function getCachedProblemCategories(problemId) { // If not cached, return from the other function
    if (typeof problemId === 'string') {
        problemId = parseInt(problemId);
    }
    
    let problems_categories = await new Promise((resolve) => {
        chrome.storage.local.get("problemCategories", function (data) {
            resolve(data.problemCategories);
        });
    });

    if (problems_categories === undefined || problems_categories[problemId] === undefined) {
        if (problems_categories === undefined) {
            problems_categories = new Map();
        }
        problems_categories[problemId] = await getProblemCategories(problemId);
        chrome.storage.local.set({ problemCategories: problems_categories });
    }

    return problems_categories[problemId] || [];
}

async function getProblemCategories(problemId) {
    if (typeof problemId === 'string') {
        problemId = parseInt(problemId);
    }

    let problem_categories_url = "https://aceptaelreto.com/ws/problem/${problemId}/cat";
    problem_categories_url = problem_categories_url.replace("${problemId}", problemId);
    
    let contained_categories = [];

    const request = await fetch(problem_categories_url);
    const categories_list = await request.json();
    for (const category of categories_list.category) {
        contained_categories.push(category.id);
    }

    return contained_categories;
}

async function isProblemsCategory(categoryId) {
    let category_problems_url = "https://aceptaelreto.com/ws/cat/${categoryId}/problems";
    category_problems_url = category_problems_url.replace("${categoryId}", categoryId);

    const request = await fetch(category_problems_url);
    const problem_list = await request.json();

    return problem_list.problem.length > 0;
}

async function getCategoryData(categoryId) {
    let category_name_url = "https://aceptaelreto.com/ws/cat/${categoryId}";
    category_name_url = category_name_url.replace("${categoryId}", categoryId);
    const request = await fetch(category_name_url);
    const category_data = await request.json();
    // console.log("Category data: " + category_data.name);
    return category_data;
}

async function getCategoryProblems(categoryId) {
    let category_problems_url = "https://aceptaelreto.com/ws/cat/${categoryId}/problems";
    category_problems_url = category_problems_url.replace("${categoryId}", categoryId);
    const request = await fetch(category_problems_url);
    let problem_list = await request.json();
    let problems = problem_list.problem;

    while (problem_list.nextLink !== undefined) {
        const nextRequest = await fetch(problem_list.nextLink);
        problem_list = await nextRequest.json();
        problems = problems.concat(problem_list.problem);
    }

    return problems;
}

async function getProblemInfo(problemId) {
    let problem_info_url = `https://aceptaelreto.com/ws/problem/${problemId}`;
    const request = await fetch(problem_info_url);
    const problem_data = await request.json();
    return problem_data;
}

async function getProblemLevel(problemId) {
    return levels_dict[problemId] || null;
}

async function getLevelsText(type=1) {
    // Get the level texts based on the type
    // type 0: emojis
    // type 1: Spanish text (default)
    // type 2: stars
    let unknown_text = "❔";
    let easy_text = "🟢";
    let medium_text = "🟡";
    let hard_text = "🔴";
    let very_hard_text = "💀";
    if (type == 1) { //Texto en español
        unknown_text = "Desconocido";
        easy_text = "Fácil";
        medium_text = "Medio";
        hard_text = "Difícil";
        very_hard_text = "Extremo";
    }
    else if (type == 2) { // Estrellas
        easy_text = "★☆☆";
        medium_text = "★★☆";
        hard_text = "★★★";
    }
    
    // Return dictionary with the texts
    return {
        "unknown": unknown_text,
        "easy": easy_text,
        "medium": medium_text,
        "hard": hard_text,
        "very_hard": very_hard_text
    };
}

// --- getUserProblemPosition (REEMPLAZADA por versión robusta y con fallback a ranking) ---

/**
 * Obtiene la posición real del usuario en el ranking de un problema.
 * - Primero intenta usar https://aerdata.lluiscab.net/aer/user/profile/${user_nick}
 *   soportando varias estructuras de respuesta.
 * - Si no tiene la info, realiza paginado sobre
 *   https://aceptaelreto.com/ws/problem/${problemId}/ranking y calcula
 *   la posición entre usuarios únicos (ignorando envíos repetidos).
 *
 * Devuelve:
 *  - número (1-based) si se encuentra
 *  - null si no se encuentra o hay un error
 */
async function getUserProblemPosition(user_nick, problemId) {
    // Helper: intenta varias rutas esperadas dentro del JSON retornado por aerdata
    function extractProblemsFromAerdata(data) {
        // posibles ubicaciones:
        // data.data.user.problems
        // data.user.problems
        // data.problems
        // data.data.problems
        if (!data) return null;
        if (data.data && data.data.user && Array.isArray(data.data.user.problems)) return data.data.user.problems;
        if (data.user && Array.isArray(data.user.problems)) return data.user.problems;
        if (Array.isArray(data.problems)) return data.problems;
        if (data.data && Array.isArray(data.data.problems)) return data.data.problems;
        return null;
    }

    // Intento 1: aerdata (rápido si existe y tiene info)
    try {
        const position_url = `https://aerdata.lluiscab.net/aer/user/profile/${encodeURIComponent(user_nick)}`;
        const resp = await fetch(position_url);
        if (resp.ok) {
            let data;
            try {
                data = await resp.json();
            } catch (e) {
                // respuesta no JSON o mal formada -> seguir a fallback
                console.warn("getUserProblemPosition: aerdata returned non-JSON or malformed JSON", e);
                data = null;
            }

            const problems = extractProblemsFromAerdata(data);
            if (problems) {
                for (const problem of problems) {
                    // soporte flex: problem.id o problem.num dependiendo de la API
                    if (String(problem.id || problem.num) == String(problemId)) {
                        // protección: comprobar estructura result.position
                        const pos = problem?.result?.position ?? null;
                        if (pos !== undefined && pos !== null) return pos;
                        // si la estructura es distinta, intentar otras rutas
                        if (problem.result && typeof problem.result === "number") return problem.result;
                        // si problem tiene 'position' en otro sitio
                        if (problem.position) return problem.position;
                        // si no hay, devolvemos null para fallback
                        return null;
                    }
                }
                // no encontrado en la lista de problemas del usuario
                // no hacemos return aún; puede que el ranking oficial lo incluya (por ejemplo, si la aerdata está desactualizada)
            } else {
                console.info("getUserProblemPosition: aerdata endpoint responded but structure unexpected:", data);
            }
        } else {
            console.info("getUserProblemPosition: aerdata responded with HTTP", resp.status);
        }
    } catch (error) {
        console.warn("getUserProblemPosition: error querying aerdata:", error);
    }

    // Fallback: calcular posición recorriendo el ranking oficial y contando usuarios únicos.
    // Esto garantiza la "posición real" ignorando envíos repetidos del mismo usuario.
    try {
        // Primero, intentar obtener userID numérica (si falla, seguiremos comparando por nick)
        let targetUserId = null;
        try {
            targetUserId = await getUserID(user_nick);
        } catch (e) {
            // no crítico
            targetUserId = null;
        }

        let seenUsers = new Set(); // user.id (num) preferente
        let rank = 0; // posición (1-based) entre usuarios únicos

        // Paginación inicial
        let pageUrl = `https://aceptaelreto.com/ws/problem/${encodeURIComponent(problemId)}/ranking?start=1&size=100`;

        while (pageUrl) {
            let r = await fetch(pageUrl);
            if (!r.ok) {
                console.warn("getUserProblemPosition: ranking endpoint returned HTTP", r.status, "for", pageUrl);
                break; // salir y devolver null
            }
            let json;
            try {
                json = await r.json();
            } catch (e) {
                console.warn("getUserProblemPosition: ranking endpoint returned non-JSON", e);
                break;
            }

            const submissions = Array.isArray(json.submission) ? json.submission : [];
            for (const entry of submissions) {
                // Asegurarnos de la existencia de user
                if (!entry.user) continue;

                const uid = entry.user.id != null ? String(entry.user.id) : null;
                const nick = entry.user.nick != null ? String(entry.user.nick) : null;

                // Identificador preferente: uid, si no available fallback a nick
                const seenKey = uid || (`nick:${nick}`);

                if (!seenUsers.has(seenKey)) {
                    seenUsers.add(seenKey);
                    rank += 1;

                    // Comparar por id primero (si lo tenemos) luego por nick
                    if (targetUserId && uid && String(targetUserId) === String(uid)) {
                        return rank;
                    }
                    if (!targetUserId && nick && String(nick) === String(user_nick)) {
                        return rank;
                    }
                    // Si tenemos ambos, comparar ambos por seguridad
                    if (targetUserId && nick && String(nick) === String(user_nick)) {
                        return rank;
                    }
                }
                // si ya visto, ignorar (es envío repetido)
            }

            // Avanzar pagina: la API devuelve nextLink o bien hay que calcular start
            if (json.nextLink) {
                pageUrl = json.nextLink;
            } else {
                // si no hay nextLink, probar a incrementar start si sabemos size y start
                // intentar leer start y size de la respuesta (no todos endpoints lo devuelven)
                // fallback: si la última página tenía menos entradas que el tamaño, terminamos
                if (submissions.length === 0) {
                    break;
                }
                // Intentar calcular siguiente start basándonos en la URL actual
                const urlObj = new URL(pageUrl);
                const start = parseInt(urlObj.searchParams.get('start') || '1');
                const size = parseInt(urlObj.searchParams.get('size') || '100');
                if (submissions.length < size) {
                    // última página
                    break;
                }
                const nextStart = start + submissions.length;
                urlObj.searchParams.set('start', String(nextStart));
                pageUrl = urlObj.toString();
            }
            // evitar bucles infinitos: si la cantidad de usuarios únicos crece mucho, continuar hasta el final.
            // En circunstancias normales esto terminará.
        }

        // Si hemos recorrido todo el ranking y no hemos encontrado al usuario:
        return null;
    } catch (error) {
        console.error("Error fetching user problem position:", error);
        return null;
    }
}

// --- resto del archivo original (sin cambios) ---

try {
    module.exports = { isAC, isTried, isCategoryCompleted, isVolumeCompleted, getUserID, getNick, getLastError, getProblemCategories, isProblemsCategory, getCategoryData, getCategoryProblems, getProblemInfo, getProblemLevel, getLevelsText, getUserProblemPosition };
}
catch (e) {
    // Do nothing, this is for testing purposes
    //console.log("Error: " + e);
    //console.log("This is not a test environment");
}
