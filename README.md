# ⚙️ AeRForU – Correcciones Críticas (Fix Version)

Este repositorio contiene **correcciones críticas** para el plugin **AeRForU**, una extensión de Chrome que mejora la experiencia de usuario en [Acepta el Reto](https://aceptaelreto.com).  
Estas mejoras solucionan fallos en los rankings y la **detección de la posición real** de los usuarios.

---

## 🐛 Problemas Corregidos

### 1️⃣ Botón "Ver más" en Rankings Infinito
**Archivo afectado:** `scripts/problem_stats.js`

#### ❌ Problema anterior:
- El botón "Ver más" seguía apareciendo indefinidamente.  
- No se detectaba el final de la lista de rankings.  
- Causaba confusión al intentar cargar más resultados inexistentes.

#### ✅ Solución implementada:
```javascript
// ✅ Antes de insertar el botón, verificar que existen más resultados
const checkUrl = `https://aceptaelreto.com/ws/problem/${problem_id}/ranking?start=${currentCount + 1}&size=1`;
const response = await fetch(checkUrl);
const data = await response.json();

// Si no hay más resultados, no añadimos el botón
if (!data.submission || data.submission.length === 0) {
    console.log("No hay más rankings: no se mostrará 'Ver más'.");
    return;
}
```

```javascript
// ✅ Al cargar más rankings, detectar cuando no hay más resultados
if (!data.submission || data.submission.length === 0) {
    console.log("No more rankings to load.");
    const seeMoreRow = document.getElementById("seeMoreRankingRow");
    if (seeMoreRow) seeMoreRow.remove();
    return;
}
```

#### 🔄 Comportamiento actual:
- El botón solo se muestra si existen más resultados en el servidor.  
- Se elimina automáticamente cuando se alcanza el final de la lista.  
- Evita cargas innecesarias y estados de error.  
- Incluye prevención de clics múltiples mientras se cargan datos.

---

### 2️⃣ Error al Obtener Posición Real en Rankings
**Archivo afectado:** `scripts/getters.js`  
**Función:** `getUserProblemPosition`

#### ❌ Problema anterior:
- Error en consola al obtener la posición del usuario.  
- Fallos con diferentes estructuras JSON de la API.  
- Sin fallback cuando el endpoint principal fallaba.

#### ✅ Solución implementada:

**a) Soporte flexible para múltiples estructuras JSON**
```javascript
function extractProblemsFromAerdata(data) {
    if (!data) return null;
    if (data.data && data.data.user && Array.isArray(data.data.user.problems)) 
        return data.data.user.problems;
    if (data.user && Array.isArray(data.user.problems)) 
        return data.user.problems;
    if (Array.isArray(data.problems)) 
        return data.problems;
    if (data.data && Array.isArray(data.data.problems)) 
        return data.data.problems;
    return null;
}
```

**b) Sistema de fallback robusto con cálculo desde el ranking oficial**
```javascript
// Intento 1: API rápida (aerdata.lluiscab.net)
try {
    const position_url = `https://aerdata.lluiscab.net/aer/user/profile/${user_nick}`;
    const resp = await fetch(position_url);
    if (resp.ok) {
        const data = await resp.json();
        const problems = extractProblemsFromAerdata(data);
        if (problems) {
            // Buscar problema y obtener posición...
        }
    }
} catch (error) {
    console.warn("getUserProblemPosition: error querying aerdata:", error);
}

// Fallback: calcular posición desde el ranking oficial
let seenUsers = new Set();
let rank = 0;

let pageUrl = `https://aceptaelreto.com/ws/problem/${problemId}/ranking?start=1&size=100`;

while (pageUrl) {
    const json = await fetch(pageUrl).then(r => r.json());
    const submissions = json.submission || [];
    
    for (const entry of submissions) {
        const uid = entry.user.id;
        const nick = entry.user.nick;
        const seenKey = uid || (`nick:${nick}`);
        
        if (!seenUsers.has(seenKey)) {
            seenUsers.add(seenKey);
            rank += 1;
            
            if (targetUserId && String(targetUserId) === String(uid)) return rank;
            if (String(nick) === String(user_nick)) return rank;
        }
    }
    
    pageUrl = json.nextLink || calcularSiguientePagina(pageUrl, submissions);
}

return null; // No encontrado
```

#### ✨ Mejoras adicionales:
- **Usuarios únicos:** ignora múltiples envíos del mismo usuario.  
- **Comparación flexible:** por ID o nickname.  
- **Paginación inteligente:** soporta `nextLink` o cálculo manual.  
- **Prevención de bucles infinitos.**  
- **Logging detallado** y manejo de errores con `try/catch`.

#### 🔄 Comportamiento actual:
- Prioriza la API rápida (`aerdata`) si está disponible.  
- Si falla, calcula la posición real desde el ranking oficial.  
- Soporta todas las estructuras conocidas (presentes y futuras).  
- Devuelve `null` solo si realmente no se encuentra el usuario.  
- Garantiza precisión contando **solo usuarios únicos**.

---

## 📝 Cambios en Archivos

### `scripts/problem_stats.js`
- ✅ Verificación previa antes de mostrar el botón “Ver más”.  
- ✅ Detección de fin de lista y eliminación automática del botón.  
- ✅ Prevención de clics múltiples con estado de “Cargando...”.  
- ✅ Manejo robusto de errores HTTP y respuestas vacías.

### `scripts/getters.js`
- ✅ Refactor completo de `getUserProblemPosition()`.  
- ✅ Sistema de fallback entre *aerdata* y *ranking oficial*.  
- ✅ Función auxiliar `extractProblemsFromAerdata()` para soportar múltiples JSON.  
- ✅ Cálculo de posición real con usuarios únicos.  
- ✅ Paginación y prevención de bucles infinitos.  
- ✅ Logging mejorado y control de casos edge.

---

## 🔧 Detalles Técnicos

### 🧩 Detección del Final del Ranking
- Consulta `size=1` para verificar si hay más resultados.  
- Solo muestra el botón si existen datos válidos.  
- Elimina el botón automáticamente al detectar una página vacía.

### 📊 Algoritmo de Posición Real
- Usa un `Set` de usuarios únicos (`seenUsers`).  
- Incrementa el contador de ranking solo con usuarios nuevos.  
- Identificador compuesto: `uid` preferente, `nick` como fallback.  
- Soporte completo para paginación del ranking.

### 🔗 Compatibilidad con APIs
Soporta múltiples estructuras de API:
- `data.data.user.problems`  
- `data.user.problems`  
- `data.problems`  
- `data.data.problems`

---

## 🤝 Contribución
Este es un **fork con correcciones específicas** enfocadas en estabilidad y precisión.  
Si deseas contribuir al proyecto principal, visita el **[repositorio original](https://github.com/Jaimepas77/AeRForU/tree/main))**.

---
