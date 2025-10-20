# 🔧 Solución de Problemas - Canino Hub Calendar

## ❌ "No veo eventos aunque compartí el calendario"

### Pasos de diagnóstico:

#### 1️⃣ **Abre la Consola del Navegador**

1. En Chrome/Edge: `F12` o `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
2. Ve a la pestaña **"Console"**
3. Refresca la página con `Cmd+R` o `Ctrl+R`
4. Ve al tab **"Planner"** en la app

Deberías ver logs como:
```
📅 Loading calendar events...
   Calendar ID: canino.sound@gmail.com
   Date range: ...
   Access token: ✓ Present
📡 Fetching calendar events from: https://...
📡 Response status: 200 OK
✓ Events found: 5
```

#### 2️⃣ **Identifica el error específico**

##### **Error 401 - Authentication failed**
```
❌ API Error Response: {error: {code: 401, message: "..."}
```
**Solución:**
- Cierra sesión en la app (Settings ⚙️ → Sign Out)
- Vuelve a iniciar sesión
- Cuando conectes Calendar, asegúrate de **aceptar TODOS los permisos**

##### **Error 403 - Access Denied / Forbidden**
```
❌ API Error Response: {error: {code: 403, message: "Forbidden"}
```
**Causas posibles:**

**A) Google Calendar API no está habilitada:**
1. Ve a [Google Cloud Console](https://console.cloud.google.com/apis/library)
2. Busca **"Google Calendar API"**
3. Asegúrate de que dice **"API ENABLED"** (en verde)
4. Si dice "ENABLE", haz clic en **"ENABLE"**

**B) No tienes acceso al calendario:**
1. Inicia sesión en [Google Calendar](https://calendar.google.com) con la cuenta **canino.sound@gmail.com**
2. Encuentra el calendario en la lista de la izquierda
3. Clic en los **tres puntos (⋮)** → **"Configuración y uso compartido"**
4. En **"Compartir con determinadas personas"**, verifica que esté tu email
5. Si no está, añádelo con permiso **"Ver todos los detalles del evento"**

##### **Error 404 - Not Found**
```
❌ API Error Response: {error: {code: 404, message: "Not Found"}
```
**Causas posibles:**

**A) El Calendar ID es incorrecto:**
- El email `canino.sound@gmail.com` debe existir como cuenta de Google
- Verifica que escribiste el email correctamente

**B) El calendario no existe o está eliminado:**
- Inicia sesión en [Google Calendar](https://calendar.google.com) con `canino.sound@gmail.com`
- Verifica que el calendario exista

##### **Error 400 - Bad Request**
```
❌ API Error Response: {error: {code: 400, message: "Bad Request"}
```
**Solución:**
- Esto indica un problema con la solicitud
- Refresca la página
- Si persiste, reporta el error completo

#### 3️⃣ **Verifica los permisos de OAuth**

El problema más común es que al conectar Google Calendar, **no aceptaste todos los permisos**.

**Cómo reconectar correctamente:**

1. Ve a Settings (⚙️) → Sign Out
2. Vuelve a la página de login
3. Inicia sesión con Google
4. Ve al tab **"Planner"**
5. Haz clic en **"📅 Connect Google Calendar"**
6. En la ventana de permisos de Google, asegúrate de ver:
   ```
   Canino Hub wants to:
   ✓ Ver tus calendarios de Google Calendar
   ✓ Ver eventos de todos tus calendarios
   ✓ Ver y editar eventos de calendarios compartidos
   ```
7. Haz clic en **"Permitir"** / **"Allow"**

#### 4️⃣ **Revoca y vuelve a conectar (Hard Reset)**

Si nada funciona:

1. Ve a [myaccount.google.com/permissions](https://myaccount.google.com/permissions)
2. Busca **"Canino Hub"** en la lista
3. Haz clic y selecciona **"Eliminar acceso"**
4. Vuelve a la app
5. Sign Out → Sign In
6. Conecta Calendar de nuevo
7. Acepta **TODOS** los permisos

#### 5️⃣ **Verifica el Scope en Google Cloud Console**

Si sigues teniendo problemas de permisos:

1. Ve a [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Encuentra tu **OAuth 2.0 Client ID**
3. Haz clic para editarlo
4. En **"Authorized JavaScript origins"**, verifica que esté:
   - `http://localhost:3000`
   - Tu dominio si estás en producción

5. Ve a [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
6. En **"Scopes"**, asegúrate de tener:
   - `https://www.googleapis.com/auth/drive`
   - `https://www.googleapis.com/auth/calendar` o `https://www.googleapis.com/auth/calendar.readonly`

#### 6️⃣ **Problema: "No upcoming events" (pero sí hay eventos)**

Si la app carga correctamente pero dice "No upcoming events":

**Verifica en la consola:**
```
✓ Events found: 0
```

**Causas posibles:**

**A) No hay eventos en los próximos 30 días:**
- La app solo muestra eventos de hoy hasta dentro de 30 días
- Eventos pasados no se muestran
- Crea un evento de prueba para mañana en `canino.sound@gmail.com`

**B) Los eventos están en otro calendario:**
- Asegúrate de que los eventos están en el calendario principal de `canino.sound@gmail.com`
- No en un calendario secundario

**C) Los eventos están marcados como "privados":**
- En Google Calendar, edita el evento
- En "Visibilidad", asegúrate de que NO sea "Privado"

---

## 🧪 Crear un evento de prueba

Para verificar que todo funciona:

1. Ve a [Google Calendar](https://calendar.google.com)
2. Inicia sesión con **`canino.sound@gmail.com`**
3. Crea un evento para **mañana** a cualquier hora:
   - Título: "TEST - Ensayo Canino"
   - Fecha: Mañana
   - Hora: 19:00 - 21:00
   - Ubicación: "Estudio A"
4. Guarda el evento
5. Vuelve a **Canino Hub** → **Planner**
6. Haz clic en el botón **🔄**
7. Deberías ver el evento con el badge **"Tomorrow"**

---

## 📞 Soporte

Si después de todos estos pasos sigue sin funcionar:

1. Copia los mensajes de error de la consola
2. Toma una captura de pantalla
3. Comparte:
   - El error completo
   - Los logs de la consola
   - Qué pasos seguiste

---

## ✅ Checklist rápido

Antes de pedir ayuda, verifica:

- [ ] Google Calendar API está **habilitada** en Google Cloud Console
- [ ] El calendario de `canino.sound@gmail.com` está **compartido** contigo
- [ ] Has **conectado Google Calendar** en la app
- [ ] Aceptaste **todos los permisos** al conectar
- [ ] Hay **eventos en los próximos 30 días** en el calendario
- [ ] Los eventos NO están marcados como privados
- [ ] No hay errores en la **consola del navegador**

---

**¿Sigue sin funcionar?** Comparte el error completo de la consola y te ayudamos. 🤝

