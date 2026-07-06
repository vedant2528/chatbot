// Knowledge Base Manager - Add to app.js or include as separate module

const KnowledgeBaseManager = (() => {
  let knowledgeBaseDocs = [];
  
  const showKBPanel = () => {
    const modal = document.createElement("div");
    modal.className = "kb-modal";
    modal.innerHTML = `
      <div class="kb-panel">
        <div class="kb-header">
          <h2>Knowledge Base</h2>
          <button class="kb-close" type="button">×</button>
        </div>
        
        <div class="kb-tabs">
          <button class="kb-tab active" data-tab="add-doc">Add Document</button>
          <button class="kb-tab" data-tab="search-kb">Search</button>
          <button class="kb-tab" data-tab="list-docs">Documents</button>
        </div>
        
        <div class="kb-content">
          <!-- Add Document Tab -->
          <div class="kb-tab-content active" id="add-doc">
            <form class="kb-form" id="add-doc-form">
              <input type="text" placeholder="Document Title" id="kb-title" required />
              <textarea placeholder="Document Content (paste your knowledge here)" id="kb-content" rows="6" required></textarea>
              <select id="kb-category">
                <option value="general">General</option>
                <option value="technical">Technical</option>
                <option value="business">Business</option>
                <option value="reference">Reference</option>
                <option value="custom">Custom</option>
              </select>
              <button type="submit" class="kb-btn-primary">Add to Knowledge Base</button>
            </form>
            <div id="add-doc-status" class="kb-status"></div>
          </div>
          
          <!-- Search Tab -->
          <div class="kb-tab-content" id="search-kb">
            <input type="text" placeholder="Search knowledge base..." id="kb-search-input" />
            <button class="kb-btn-primary" id="kb-search-btn">Search</button>
            <div id="kb-search-results" class="kb-results"></div>
          </div>
          
          <!-- List Documents Tab -->
          <div class="kb-tab-content" id="list-docs">
            <button class="kb-btn-primary" id="kb-refresh-btn">Refresh List</button>
            <div id="kb-doc-list" class="kb-doc-list"></div>
            <div id="kb-stats" class="kb-stats"></div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    setupKBEventListeners(modal);
  };
  
  const setupKBEventListeners = (modal) => {
    // Close button
    modal.querySelector(".kb-close").addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });
    
    // Tab switching
    modal.querySelectorAll(".kb-tab").forEach(btn => {
      btn.addEventListener("click", () => {
        modal.querySelectorAll(".kb-tab").forEach(b => b.classList.remove("active"));
        modal.querySelectorAll(".kb-tab-content").forEach(c => c.classList.remove("active"));
        btn.classList.add("active");
        const tabId = btn.dataset.tab;
        modal.querySelector(`#${tabId}`).classList.add("active");
      });
    });
    
    // Add document
    modal.querySelector("#add-doc-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = modal.querySelector("#kb-title").value;
      const content = modal.querySelector("#kb-content").value;
      const category = modal.querySelector("#kb-category").value;
      
      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);
      formData.append("category", category);
      
      try {
        const res = await fetch("/kb/add", { method: "POST", body: formData });
        const data = await res.json();
        const statusEl = modal.querySelector("#add-doc-status");
        
        if (data.success) {
          statusEl.className = "kb-status success";
          statusEl.textContent = `✓ ${data.message}`;
          modal.querySelector("#add-doc-form").reset();
        } else {
          statusEl.className = "kb-status error";
          statusEl.textContent = `✗ ${data.error}`;
        }
      } catch (err) {
        modal.querySelector("#add-doc-status").className = "kb-status error";
        modal.querySelector("#add-doc-status").textContent = `✗ Error: ${err.message}`;
      }
    });
    
    // Search
    modal.querySelector("#kb-search-btn").addEventListener("click", async () => {
      const query = modal.querySelector("#kb-search-input").value;
      if (!query) return;
      
      const formData = new FormData();
      formData.append("query", query);
      
      try {
        const res = await fetch("/kb/search", { method: "POST", body: formData });
        const data = await res.json();
        const resultsEl = modal.querySelector("#kb-search-results");
        
        if (data.count === 0) {
          resultsEl.innerHTML = "<p class='no-results'>No documents found</p>";
        } else {
          resultsEl.innerHTML = data.results.map(doc => `
            <div class="kb-result-item">
              <h4>${doc.title}</h4>
              <span class="kb-category">${doc.category}</span>
              <p>${doc.content.substring(0, 150)}...</p>
              <button class="kb-btn-delete" data-id="${doc.id}">Delete</button>
            </div>
          `).join("");
          
          resultsEl.querySelectorAll(".kb-btn-delete").forEach(btn => {
            btn.addEventListener("click", () => deleteDoc(btn.dataset.id, modal));
          });
        }
      } catch (err) {
        modal.querySelector("#kb-search-results").innerHTML = `<p class='error'>Error: ${err.message}</p>`;
      }
    });
    
    // List documents
    modal.querySelector("#kb-refresh-btn").addEventListener("click", loadDocuments.bind(null, modal));
    loadDocuments(modal);
  };
  
  const loadDocuments = async (modal) => {
    try {
      const [docsRes, statsRes] = await Promise.all([
        fetch("/kb/list"),
        fetch("/kb/stats")
      ]);
      
      const docs = await docsRes.json();
      const stats = await statsRes.json();
      
      const listEl = modal.querySelector("#kb-doc-list");
      if (docs.count === 0) {
        listEl.innerHTML = "<p class='no-results'>No documents in knowledge base</p>";
      } else {
        listEl.innerHTML = docs.documents.map(doc => `
          <div class="kb-doc-item">
            <div class="kb-doc-header">
              <h4>${doc.title}</h4>
              <span class="kb-category">${doc.category}</span>
            </div>
            <p class="kb-doc-meta">Tokens: ${doc.tokens || 0} | Added: ${new Date(doc.created_at).toLocaleDateString()}</p>
            <button class="kb-btn-delete" data-id="${doc.id}">Delete</button>
          </div>
        `).join("");
        
        listEl.querySelectorAll(".kb-btn-delete").forEach(btn => {
          btn.addEventListener("click", () => deleteDoc(btn.dataset.id, modal));
        });
      }
      
      const statsEl = modal.querySelector("#kb-stats");
      statsEl.innerHTML = `
        <div class="kb-stats-grid">
          <div><strong>Total Documents:</strong> ${docs.count}</div>
          <div><strong>Total Tokens:</strong> ${stats.total_tokens}</div>
          <div><strong>Categories:</strong> ${Object.keys(stats.categories || {}).join(", ") || "None"}</div>
        </div>
      `;
    } catch (err) {
      modal.querySelector("#kb-doc-list").innerHTML = `<p class='error'>Error loading documents: ${err.message}</p>`;
    }
  };
  
  const deleteDoc = async (docId, modal) => {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    
    try {
      const res = await fetch(`/kb/delete/${docId}`, { method: "POST" });
      if (res.ok) {
        alert("Document deleted");
        loadDocuments(modal);
      } else {
        alert("Failed to delete document");
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };
  
  return { showKBPanel };
})();
