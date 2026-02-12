# Adding SceneMapper to Git (first-time guide)

You need **Git** installed and a **GitHub** (or GitLab/Bitbucket) account.

---

## 1. Install Git (if needed)

- Download: https://git-scm.com/download/win  
- Run the installer; default options are fine.  
- Restart Cursor/terminal after installing.

Check it works:

```powershell
git --version
```

---

## 2. Tell Git who you are (one-time per machine)

Git needs your name and email for every commit. Set them once:

```powershell
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```

Use the **email tied to your GitHub account** so your commits show on your profile.

---

## 3. Turn this folder into a Git repo

Open a terminal in the project folder (e.g. **Terminal → New Terminal** in Cursor; it usually opens in the project root).

```powershell
cd "c:\Users\narya\OneDrive\Documents\Games\SceneMapper"
git init
```

- **`git init`** creates a hidden `.git` folder. Git will track changes only inside this folder.

---

## 4. Stage and commit your code

**Stage** = choose which files to include in the next “save” (commit).

```powershell
git add .
```

- **`.`** = “all changed files in this folder.”  
- `.gitignore` already excludes `node_modules`, `.next`, `.env*.local`, etc., so they won’t be added.

**Commit** = save a snapshot with a message:

```powershell
git commit -m "Initial commit: SceneMapper"
```

You now have one commit (your whole project) stored locally.

---

## 5. Create a repo on GitHub

1. Go to **https://github.com** and sign in.  
2. Click the **+** (top right) → **New repository**.  
3. **Repository name:** e.g. `SceneMapper`.  
4. **Public** is fine.  
5. **Do not** check “Add a README” (you already have code).  
6. Click **Create repository**.

GitHub will show a page with a URL like:

- `https://github.com/YOUR_USERNAME/SceneMapper.git`

Copy that URL.

---

## 6. Connect your folder to GitHub and push

Back in the project terminal:

**Add the remote** (Git’s name for “the repo on GitHub”):

```powershell
git remote add origin https://github.com/YOUR_USERNAME/SceneMapper.git
```

Replace `YOUR_USERNAME/SceneMapper` with your actual username and repo name.

**Use the `main` branch** (GitHub’s default):

```powershell
git branch -M main
```

**Push** (upload your commits to GitHub):

```powershell
git push -u origin main
```

- You may be asked to sign in (browser or username/password/token).  
- **`-u origin main`** means “from now on, `git push` will send to `origin` on `main`.”

After this, your code is on GitHub. You can refresh the repo page and see all your files.

---

## 7. Later: save more progress

Whenever you want to save a new “snapshot”:

```powershell
git add .
git commit -m "Short description of what you did"
git push
```

- **`git add .`** — stage current changes.  
- **`git commit -m "..."`** — save them locally with a message.  
- **`git push`** — upload to GitHub.

---

## Quick reference

| Goal              | Command                    |
|-------------------|----------------------------|
| See status        | `git status`               |
| Stage all changes | `git add .`                 |
| Commit            | `git commit -m "message"`   |
| Push to GitHub    | `git push`                 |
| Pull from GitHub  | `git pull`                 |

If you use a different host (GitLab, Bitbucket), the steps are the same; only the URL in step 6 changes (e.g. `https://gitlab.com/username/SceneMapper.git`).
