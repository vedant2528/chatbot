#!/usr/bin/env python3
"""
Sample Data Loader for Knowledge Base
Run this script to populate your knowledge base with sample documents.

Usage: python load_sample_data.py
"""

from knowledge_base import kb

SAMPLE_DOCUMENTS = [
    {
        "title": "Python Best Practices",
        "category": "technical",
        "content": """
Python Best Practices and Guidelines:

1. Code Style
- Follow PEP 8 guidelines for consistent code style
- Use meaningful variable and function names
- Keep lines under 79 characters where possible
- Use 4 spaces for indentation (never tabs)

2. Functions
- Write small, focused functions with a single responsibility
- Use type hints for better code clarity (Python 3.5+)
- Document functions with docstrings
- Avoid using mutable default arguments

3. Error Handling
- Use specific exception types rather than bare except clauses
- Use try/except/finally for resource management
- Consider using context managers (with statement)
- Log errors appropriately for debugging

4. Performance
- Use list comprehensions instead of loops when appropriate
- Avoid unnecessary function calls in loops
- Use generators for large datasets
- Profile code before optimizing

5. Testing
- Write unit tests alongside your code
- Aim for high code coverage
- Use pytest for better test organization
- Mock external dependencies appropriately
"""
    },
    {
        "title": "Web Development with Flask",
        "category": "technical",
        "content": """
Flask Framework Guide:

1. Project Structure
- Organize code into blueprints for larger projects
- Keep configurations in separate files
- Use templates directory for HTML files
- Store static assets in static directory

2. Routing
- Define routes with @app.route() decorator
- Use URL variables with <variable_name>
- Support multiple HTTP methods with methods parameter
- Use proper HTTP status codes in responses

3. Templates
- Use Jinja2 templating language
- Pass variables from views to templates
- Use template inheritance for consistency
- Escape user input to prevent XSS attacks

4. Database Integration
- Use SQLAlchemy ORM for database operations
- Define models as classes
- Use migrations with Alembic
- Implement proper indexing for performance

5. Authentication & Security
- Hash passwords with werkzeug.security
- Use CSRF protection on forms
- Validate and sanitize user input
- Use environment variables for secrets
- Keep dependencies updated

6. Testing Flask Applications
- Use pytest with pytest-flask plugin
- Test views with test client
- Mock database for unit tests
- Test error handling thoroughly
"""
    },
    {
        "title": "Machine Learning Fundamentals",
        "category": "technical",
        "content": """
Introduction to Machine Learning:

1. Supervised Learning
- Regression: predicting continuous values
- Classification: predicting categories/classes
- Common algorithms: Linear Regression, Decision Trees, SVM
- Training and validation split is crucial

2. Unsupervised Learning
- Clustering: grouping similar data points
- Dimensionality reduction: reducing feature count
- Anomaly detection: finding unusual patterns
- K-means and DBSCAN are popular algorithms

3. Data Preprocessing
- Handle missing values (removal, imputation)
- Normalize or standardize numerical features
- Encode categorical variables
- Remove or handle outliers appropriately

4. Model Evaluation
- Use appropriate metrics (accuracy, precision, recall, F1)
- Cross-validation for reliable estimates
- Confusion matrices for classification
- ROC-AUC curves for threshold selection

5. Feature Engineering
- Create meaningful features from raw data
- Select most relevant features
- Use domain knowledge effectively
- Avoid data leakage between train/test sets

6. Common Pitfalls
- Overfitting: model memorizes training data
- Underfitting: model too simple for problem
- Imbalanced datasets: use stratified sampling
- Ignoring baseline models: always compare
"""
    },
    {
        "title": "JavaScript Async Programming",
        "category": "technical",
        "content": """
Mastering Asynchronous JavaScript:

1. Callbacks
- Original async pattern in JavaScript
- Can lead to "callback hell" with nesting
- Useful for simple operations
- Always handle errors in callbacks

2. Promises
- Three states: pending, fulfilled, rejected
- Chain operations with .then() and .catch()
- Use Promise.all() for multiple operations
- Use Promise.race() for first completion

3. Async/Await
- Syntactic sugar over promises
- Makes async code look synchronous
- Use try/catch for error handling
- Always await promise-returning functions

4. Event Loop
- JavaScript is single-threaded
- Callbacks are queued in event loop
- Microtasks (promises) execute before macrotasks (timers)
- Understanding helps debug timing issues

5. Common Patterns
- Fetch API for HTTP requests
- Promise chains vs async/await
- Error propagation through chains
- Timeout handling for slow operations

6. Performance Considerations
- Avoid blocking the main thread
- Use Web Workers for CPU-intensive tasks
- Batch DOM updates efficiently
- Debounce/throttle event handlers
"""
    },
    {
        "title": "Database Design Principles",
        "category": "reference",
        "content": """
Fundamentals of Database Design:

1. Normalization
- First Normal Form (1NF): atomic values
- Second Normal Form (2NF): no partial dependencies
- Third Normal Form (3NF): no transitive dependencies
- BCNF: Boyce-Codd Normal Form
- Balance between normalization and performance

2. Data Types
- Choose appropriate types for data
- Numeric: integers, decimals, floats
- String: char, varchar, text
- Date/Time: appropriate for timestamps
- Custom types: enums, JSON (in modern databases)

3. Indexing Strategy
- Primary keys always indexed
- Foreign keys should be indexed
- Composite indexes for multi-column queries
- B-tree indexes for range queries
- Hash indexes for equality

4. Relationships
- One-to-One: shared primary key or unique FK
- One-to-Many: most common relationship
- Many-to-Many: requires junction table
- Self-referencing: hierarchical data

5. Query Optimization
- Use EXPLAIN to analyze queries
- Index frequently searched columns
- Avoid SELECT *
- Use appropriate JOIN types
- Monitor slow queries

6. Backup & Recovery
- Regular backups essential
- Test recovery procedures
- Replication for high availability
- Point-in-time recovery planning
"""
    }
]

def load_samples():
    """Load sample documents into knowledge base."""
    print("Loading sample documents into knowledge base...")
    
    for doc in SAMPLE_DOCUMENTS:
        result = kb.add_document(
            title=doc["title"],
            content=doc["content"].strip(),
            category=doc["category"]
        )
        
        if result["success"]:
            print(f"✓ Added: {doc['title']}")
        else:
            print(f"✗ Failed: {doc['title']} - {result.get('error', 'Unknown error')}")
    
    # Display stats
    stats = kb.get_stats()
    print(f"\nKnowledge Base Stats:")
    print(f"  Total Documents: {stats['total_documents']}")
    print(f"  Total Tokens: {stats['total_tokens']}")
    print(f"  Categories: {dict(stats['categories'])}")
    print("\nSample documents loaded successfully!")
    print("Start your Flask server and click the 📚 Knowledge Base button to manage documents.")

if __name__ == "__main__":
    load_samples()
