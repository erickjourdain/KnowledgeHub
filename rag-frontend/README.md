# KnowledgeHub - Interface Frontend

Ce répertoire contient l'application frontend de **KnowledgeHub**, une interface web moderne et interactive construite avec **React 19**, **TypeScript** et **Vite**, permettant de gérer des collections RAG et d'interagir par chat avec ses documents.

---

## 🛠️ Stack Technique

L'application s'appuie sur les meilleures technologies de l'écosystème React moderne :

- **Framework & Build** : React 19 + TypeScript + Vite 7
- **Routage** : [TanStack Router](https://tanstack.com/router/latest) pour un routage robuste, typé de bout en bout et basé sur les fichiers.
- **Gestion de l'État** : [Jotai](https://jotai.org/) pour un état atomique léger et performant (jetons d'accès, sélection de documents, etc.).
- **Synchronisation Serveur** : [TanStack Query](https://tanstack.com/query/latest) (React Query) pour la gestion du cache des données, les requêtes et les mutations vers l'API.
- **Client HTTP** : Axios avec intercepteurs pour injecter automatiquement le jeton d'authentification Bearer.
- **Design & UI** : Material UI v7 (MUI) pour une interface soignée, responsive et compatible avec le mode sombre/lumineux.
- **Affichage Markdown** : `mui-markdown` et `react-markdown` pour un rendu enrichi des réponses textuelles générées par le LLM.
- **Temps Réel** : Communication par WebSockets pour suivre en direct l'avancement de l'indexation et du traitement des documents.

---

## ✨ Fonctionnalités Clés du Frontend

### 1. Espace Conversationnel Avancé (Chat)
- Discussion avec le LLM en temps réel.
- **Sélecteur de LLM** : Permet de choisir dynamiquement le modèle utilisé par le RAG pour formuler ses réponses (ex: Gemma, Llama...).
- **Citations interactives des sources** : Chaque source citée sous forme de carte (SourceDocumentCard) affiche l'extrait de texte, le nom du fichier d'origine et la page exacte.
- **Visualiseur PDF intégré** : En cliquant sur une source, l'application télécharge le document sous forme de Blob et l'ouvre dans un nouvel onglet, directement calé sur la page correspondante (`#page=N`).
- **Éditeur Markdown** : Barre d'outils d'écriture (`ComposerToolbar`) facilitant la saisie de requêtes complexes.

### 2. Gestion des Collections & Documents (Espace Admin & Gestionnaire)
- **Création de collections** : Formatage automatique et génération de slugs uniques pour les URL.
- **Gestion des droits d'accès** : Ajout/suppression d'utilisateurs autorisés à consulter une collection.
- **Multi-gestionnaires** : Interface dédiée pour affecter ou révoquer des gestionnaires (managers) sur les collections.
- **Importation par drag-and-drop** : Intégration de `react-dropzone` pour envoyer facilement des PDF, fichiers Word (.docx) ou texte brut (.txt).
- **Filtres de sources** : Interface permettant de sélectionner individuellement les documents qui doivent servir de contexte pour la session de chat en cours.

### 3. Navigation & Ergonomie
- **Sidebar Rétractable** : Barre de navigation latérale repliable (collapsible drawer) avec mise en valeur active de la route courante et gestion réactive du profil utilisateur.
- **Page d'informations RAG** : Vue d'ensemble affichant la configuration courante du RAG (modèles, taille des chunks, reranker).
- **Gestion des erreurs** : Composant global `ErrorPage` pour intercepter les exceptions d'API et les erreurs d'accès non autorisé.

---

## 💻 Commandes de Développement

Depuis le dossier `rag-frontend/` :

```bash
# Installer les dépendances
npm install

# Démarrer le serveur de développement local
npm run dev

# Compiler l'application pour la production (vérification TS + build Vite)
npm run build

# Lancer le linter ESLint pour vérifier la qualité du code
npm run lint

# Tester localement le build de production
npm run preview
```

> [!NOTE]
> Le serveur de développement tourne par défaut sur [http://localhost:5173](http://localhost:5173).

---

## 📁 Architecture du Code Source

```
src/
├── api/                  # Clients et services d'API Axios (auth, collections, chat...)
├── components/           # Composants UI réutilisables (ErrorPage, DrawerList, SourceDocumentCard...)
├── providers/            # Contextes globaux (Auth, WebSocket)
├── routes/               # Pages de l'application gérées par TanStack Router
│   ├── __root.tsx        # Layout racine (AppBar, Drawer/Sidebar)
│   ├── login.tsx         # Page de connexion
│   ├── info.tsx          # Page de configuration technique du RAG
│   └── _authenticated/   # Layout sécurisé pour les utilisateurs authentifiés
│       ├── index.tsx     # Tableau de bord des collections
│       ├── profile.tsx   # Profil de l'utilisateur et gestion de l'avatar/icône
│       ├── collection/   # Workspace d'une collection
│       │   └── $slug/    # Navigation par slug de la collection (Chat, Documents)
│       └── _authAdmin/   # Espace réservé aux administrateurs (Gestion des utilisateurs...)
├── store/                # Atomes de stockage Jotai (jetons, états locaux...)
├── types/                # Déclarations et interfaces TypeScript (User, Collection, Job...)
├── utils/                # Fonctions utilitaires communes (formatage, gestion des erreurs...)
├── main.tsx              # Point d'entrée de l'application
├── routeTree.gen.ts      # Arbre de routage généré automatiquement (ne pas modifier)
└── router.tsx            # Configuration globale de TanStack Router
```

---

## ⚙️ Configuration

L'application utilise les variables d'environnement définies dans le fichier `rag-frontend/.env` :

- **`VITE_API_URL`** : Indique l'URL de base pour contacter l'API REST du backend.
  - En local : `/api` (les requêtes sont relayées par le proxy de développement Vite vers le backend sur le port 8000).
  - En production : L'URL absolue de l'API (ex: `https://api.knowledgehub.votre-domaine.fr/api`).
