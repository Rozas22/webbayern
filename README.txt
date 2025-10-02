# Deploy rápido con Firebase Hosting

## Requisitos
- Node + npm (ya lo tienes)
- Firebase CLI

## Pasos (CMD como Administrador)
1) Instala CLI:
```
npm i -g firebase-tools
```
Si `firebase` no se reconoce tras instalar:
```
setx PATH "%PATH%;%APPDATA%\npm"
```
Cierra y abre CMD y prueba:
```
firebase --version
firebase login
```

2) Ve a esta carpeta y despliega:
```
cd partido-live-firebase
firebase deploy --only hosting
```
