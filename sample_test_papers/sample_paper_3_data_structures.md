# EXAM PAPER: CS202 - Data Structures & Algorithmic Efficiency

**Course**: Computer Science 202  
**Total Duration**: 30 Minutes (1800 Seconds)  
**Total Marks**: 25 Marks  
**Difficulty**: Intermediate  

---

## Section 1: Multiple Choice Questions (10 Marks)
*Recommended Time: 10 Minutes*

### Q1. [Marks: 2 | Time Limit: 120s]
What is the worst-case time complexity of searching for an element in an unbalanced Binary Search Tree (BST) of size N?
- A) O(1)
- B) O(log N)
- C) O(N)
- D) O(N log N)

**Correct Answer**: C  
**Explanation**: In a completely skewed unbalanced BST (like a linked list), searching requires inspecting all N nodes in the worst case.

---

### Q2. [Marks: 2 | Time Limit: 120s]
Which data structure operates strictly on a Last-In, First-Out (LIFO) order?
- A) Queue
- B) Stack
- C) Priority Queue
- D) Binary Heap

**Correct Answer**: B  
**Explanation**: Stacks process items in LIFO sequence (the last pushed element is popped first).

---

### Q3. [Marks: 2 | Time Limit: 120s]
What is the primary advantage of a Hash Table over a sorted Array for data retrieval?
- A) Hash tables maintain elements in strict sorted order.
- B) Average-case lookup time complexity is O(1) compared to O(log N) for binary search on an array.
- C) Hash tables do not require any extra memory allocation.
- D) Hash tables never experience collisions.

**Correct Answer**: B  
**Explanation**: Hash tables provide O(1) average lookup performance using key hashing functions.

---

### Q4. [Marks: 2 | Time Limit: 120s]
Which sorting algorithm exhibits a guaranteed worst-case time complexity of O(N log N)?
- A) Quick Sort
- B) Insertion Sort
- C) Merge Sort
- D) Bubble Sort

**Correct Answer**: C  
**Explanation**: Merge Sort always divides and merges arrays deterministically in O(N log N) time regardless of initial order.

---

### Q5. [Marks: 2 | Time Limit: 120s]
In a Min-Heap containing N elements, where is the minimum element located?
- A) At a leaf node on the bottom level
- B) At the root node (index 0 / index 1)
- C) In the middle position (index N/2)
- D) Randomly placed across nodes

**Correct Answer**: B  
**Explanation**: A Min-Heap satisfies the heap property where parent nodes are <= child nodes, making the root the smallest element.

---

## Section 2: Technical & Code Tracing Questions (15 Marks)
*Recommended Time: 20 Minutes*

### Q6. [Marks: 5 | Time Limit: 360s]
**Question**: Explain how a Circular Queue overcomes the "false overflow" problem of a standard Linear Queue implemented using a fixed-size array. Write the formula for incrementing the tail pointer.

**Expected Key Points**:
- Standard linear queues experience memory waste when front elements are dequeued, leaving unused space at the beginning.
- Circular Queues wrap around to index 0 when reaching the array end using modulo arithmetic.
- Tail pointer update formula: `tail = (tail + 1) % ARRAY_CAPACITY`.

---

### Q7. [Marks: 10 | Time Limit: 840s]
**Question**: Compare Depth-First Search (DFS) and Breadth-First Search (BFS) graph traversal strategies. Discuss data structures used (Stack vs Queue), time and space complexities, and scenario suitability (e.g., shortest path in unweighted graphs vs memory efficiency in deep trees).

**Expected Key Points**:
- BFS uses a Queue (FIFO) and visits neighbors level by level; DFS uses a Stack (LIFO or recursion) and explores paths deeply first.
- Both have Time Complexity of O(V + E) where V = vertices and E = edges.
- Space Complexity: BFS requires memory proportional to maximum width O(W); DFS requires memory proportional to maximum depth O(D).
- Suitability: BFS is optimal for finding the shortest path in unweighted graphs; DFS is preferred when memory is constrained or searching solutions deep in search trees.
