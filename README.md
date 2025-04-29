# ROI Drawing Tools 🎯🖼️

**ROI Drawing Tools** is a lightweight web-based application that allows users to draw and manage Regions of Interest (ROI) on uploaded images. It supports ROI labeling, visual editing, and exporting the annotations in JSON format. This tool is especially helpful for data labeling tasks in computer vision projects.

![github photo](https://github.com/user-attachments/assets/c079a00b-73b8-400c-9213-d44a1a7f769a)

![github photo22](https://github.com/user-attachments/assets/5bd43be8-6153-4df9-b283-4a37a032ad05)

---

## ✨ Features

- Upload and display `.png` or `.jpg` images
- Draw multiple ROI shapes and annotate them with custom class IDs
- Reorder, edit, or delete ROIs dynamically
- Download ROI data as a `.json` file
- Load images and ROI data from a pre-packaged ZIP archive
- Reversible ROI orientation toggle
- Interactive and responsive layout

---

## 🛠️ Technologies Used

### Frontend
- HTML5
- CSS3 (with responsive flexbox layout)
- JavaScript (vanilla)

### Backend
- Node.js
- Express.js
- `adm-zip` for reading ZIP files
- CORS and static file handling

---

## 📦 Folder Structure

ROI-Drawing-Tools/


├── backend/                          
│   └── server.js                    
│
├── public/                           
│   ├── index.html                   
│   ├── script.js                    
│   └── style.css

│
├── project_bundle (2).zip            
│
├── .gitignore                        
├── README.md                       
└── package.json                    

