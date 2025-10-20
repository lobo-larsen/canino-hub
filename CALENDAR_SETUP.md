# 📅 Configuración del Calendario de la Banda

## Calendario configurado: `canino.sound@gmail.com`

La app está configurada para mostrar el calendario de Google de la cuenta **`canino.sound@gmail.com`**.

---

## ⚙️ Cómo configurar el acceso al calendario

Para que todos los miembros de la banda puedan ver los eventos en la app, sigue estos pasos:

### 1️⃣ Compartir el calendario (desde canino.sound@gmail.com)

1. Inicia sesión en [Google Calendar](https://calendar.google.com) con **`canino.sound@gmail.com`**
2. En la lista de calendarios (lado izquierdo), encuentra el calendario que quieres compartir
3. Haz clic en los **tres puntos** (⋮) junto al calendario
4. Selecciona **"Configuración y uso compartido"**
5. En **"Compartir con determinadas personas"**, añade a cada miembro de la banda:
   - Haz clic en **"+ Añadir personas"**
   - Introduce el email del miembro
   - Selecciona el permiso:
     - **"Ver todos los detalles del evento"** (solo lectura)
     - **"Realizar cambios en los eventos"** (edición)
   - Haz clic en **"Enviar"**

### 2️⃣ Opción alternativa: Hacer el calendario público (no recomendado)

Si prefieres que el calendario sea público (cualquiera con el enlace puede verlo):

1. En **"Permisos de acceso"**, activa **"Hacer que esté disponible públicamente"**
2. Selecciona **"Ver todos los detalles del evento"**
3. Copia el **ID del calendario** (está en "Integrar calendario")

> ⚠️ **Nota**: Esta opción hace que el calendario sea visible para cualquiera con el enlace. Es mejor compartir individualmente con cada miembro.

---

## 🔑 Habilitar Google Calendar API

Para que la app funcione, necesitas habilitar la API de Google Calendar en Google Cloud Console:

1. Ve a [Google Cloud Console - APIs & Services](https://console.cloud.google.com/apis/library)
2. Busca **"Google Calendar API"**
3. Haz clic en **"ENABLE"** (Habilitar)
4. Espera unos segundos a que se active

---

## 🎸 Conectar la app

Una vez que el calendario esté compartido y la API habilitada:

1. Abre la app **Canino Hub**
2. Ve al tab **"Planner"** (abajo a la derecha)
3. Haz clic en **"📅 Connect Google Calendar"**
4. Inicia sesión con tu cuenta de Google (la que tiene acceso al calendario de la banda)
5. Acepta los permisos solicitados
6. ¡Listo! Los eventos del calendario de la banda aparecerán automáticamente

---

## 📝 Crear eventos para la banda

Para crear eventos que todos vean:

1. Inicia sesión en [Google Calendar](https://calendar.google.com) con **`canino.sound@gmail.com`**
2. Haz clic en **"+ Crear"** o en un día del calendario
3. Rellena los detalles del evento:
   - **Título**: "Ensayo", "Concierto en X", etc.
   - **Fecha y hora**
   - **Ubicación**: Estudio, local, venue, etc.
   - **Descripción**: Notas adicionales, setlist, etc.
4. Haz clic en **"Guardar"**

Los eventos aparecerán automáticamente en la app para todos los que tengan acceso.

---

## 🔄 Actualizar eventos en la app

Si creas, modificas o eliminas un evento en Google Calendar:

1. Ve al tab **"Planner"** en la app
2. Haz clic en el botón **🔄** (arriba a la derecha)
3. Los eventos se recargarán desde Google Calendar

---

## ❓ Solución de problemas

### "Failed to load calendar events. Make sure the band calendar is shared with you."

**Solución**: Verifica que:
1. El calendario de `canino.sound@gmail.com` esté compartido con tu cuenta
2. Hayas conectado Google Calendar en la app con la cuenta correcta
3. La API de Google Calendar esté habilitada en Google Cloud Console
4. Intenta desconectar y volver a conectar haciendo clic en el botón de settings (⚙️) → "Sign Out" → volver a iniciar sesión

### "No upcoming events"

**Solución**:
1. Verifica que haya eventos en el calendario de `canino.sound@gmail.com` en los próximos 30 días
2. Haz clic en el botón 🔄 para recargar
3. Los eventos de hace más de 30 días no se mostrarán

---

## 🎯 Ventajas del calendario compartido

✅ **Todos ven lo mismo** - Un único calendario para toda la banda
✅ **Actualización en tiempo real** - Los cambios se sincronizan automáticamente
✅ **Mobile-first** - Acceso desde el móvil durante ensayos
✅ **Integración con Drive** - Calendario + grabaciones en una sola app
✅ **Notificaciones** - Google Calendar puede enviar recordatorios automáticos

---

**¿Necesitas cambiar el calendario?** Edita el archivo `src/utils/bandCalendarConfig.js` y cambia la constante `BAND_CALENDAR_ID`.


