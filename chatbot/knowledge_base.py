
import json
import os
from datetime import datetime
from typing import List, Dict, Any
from pathlib import Path
import hashlib


class KnowledgeBase:
    def __init__(self, data_dir: str = "knowledge_data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        self.db_file = self.data_dir / "knowledge_base.json"
        self.documents = self._load_db()
    
    def _load_db(self) -> Dict[str, Any]:
        """Load knowledge base from JSON file."""
        if self.db_file.exists():
            try:
                with open(self.db_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception:
                return {"documents": []}
        return {"documents": []}
    
    def _save_db(self):
        """Save knowledge base to JSON file."""
        with open(self.db_file, 'w', encoding='utf-8') as f:
            json.dump(self.documents, f, indent=2, ensure_ascii=False, default=str)
    
    def _get_document_id(self, title: str, content: str) -> str:
        """Generate unique ID for a document based on title and content hash."""
        hash_input = f"{title}{content}".encode('utf-8')
        return hashlib.md5(hash_input).hexdigest()[:12]
    
    def add_document(self, title: str, content: str, category: str = "general") -> Dict[str, Any]:
        """Add a new document to the knowledge base."""
        doc_id = self._get_document_id(title, content)
        
        # Check if document already exists
        for doc in self.documents["documents"]:
            if doc["id"] == doc_id:
                return {"success": False, "error": "Document already exists", "id": doc_id}
        
        document = {
            "id": doc_id,
            "title": title,
            "content": content,
            "category": category,
            "created_at": datetime.now().isoformat(),
            "tokens": len(content.split()),  # rough token count
        }
        
        self.documents["documents"].append(document)
        self._save_db()
        
        return {"success": True, "id": doc_id, "message": f"Added '{title}' to knowledge base"}
    
    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search knowledge base for relevant documents."""
        query_lower = query.lower()
        query_words = set(query_lower.split())
        
        scored_docs = []
        for doc in self.documents["documents"]:
            # Score based on title and content matches
            title_match = sum(1 for word in query_words if word in doc["title"].lower()) * 2
            content_match = sum(1 for word in query_words if word in doc["content"].lower())
            score = title_match + content_match
            
            if score > 0:
                scored_docs.append((score, doc))
        
        # Sort by score descending and return top results
        scored_docs.sort(key=lambda x: x[0], reverse=True)
        return [doc for _, doc in scored_docs[:limit]]
    
    def get_all_documents(self) -> List[Dict[str, Any]]:
        """Get all documents in knowledge base."""
        return self.documents.get("documents", [])
    
    def delete_document(self, doc_id: str) -> Dict[str, Any]:
        """Delete a document from the knowledge base."""
        initial_len = len(self.documents["documents"])
        self.documents["documents"] = [d for d in self.documents["documents"] if d["id"] != doc_id]
        
        if len(self.documents["documents"]) < initial_len:
            self._save_db()
            return {"success": True, "message": "Document deleted"}
        
        return {"success": False, "error": "Document not found"}
    
    def get_context_for_query(self, query: str, max_tokens: int = 2000) -> str:
        """Get relevant context from knowledge base for a query."""
        results = self.search(query, limit=10)
        
        if not results:
            return ""
        
        context = "=== KNOWLEDGE BASE CONTEXT ===\n"
        token_count = 0
        
        for doc in results:
            doc_text = f"\n[{doc['category'].upper()}] {doc['title']}\n{doc['content']}\n"
            doc_tokens = len(doc_text.split())
            
            if token_count + doc_tokens > max_tokens:
                break
            
            context += doc_text
            token_count += doc_tokens
        
        return context if token_count > 0 else ""
    
    def get_stats(self) -> Dict[str, Any]:
        """Get knowledge base statistics."""
        docs = self.documents.get("documents", [])
        total_tokens = sum(d.get("tokens", 0) for d in docs)
        categories = {}
        
        for doc in docs:
            cat = doc.get("category", "general")
            categories[cat] = categories.get(cat, 0) + 1
        
        return {
            "total_documents": len(docs),
            "total_tokens": total_tokens,
            "categories": categories,
        }


# Global knowledge base instance
kb = KnowledgeBase()
