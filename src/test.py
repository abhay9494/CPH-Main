import pyttsx3
import time

def run_interview(questions, wait_minutes=3):
    # Initialize the text-to-speech engine
    engine = pyttsx3.init()
    
    # --- UPDATE: Set a significantly slower speech rate ---
    # The default is usually ~200. Setting it to 130 makes it much more conversational.
    engine.setProperty('rate', 130) 
    
    # Optional: You can also print the current rate to verify
    # print(f"Speech rate set to: {engine.getProperty('rate')}")

    wait_seconds = wait_minutes * 60
    print(f"Starting mock interview. You have {wait_minutes} minutes per question.\n")
    print("-" * 50)

    for i, question in enumerate(questions, start=1):
        print(f"Question {i}/{len(questions)}: {question}")
        engine.say(question)
        engine.runAndWait()

        # Wait for the specified time, except after the very last question
        if i < len(questions):
            print(f"Waiting for {wait_minutes} minutes...\n")
            time.sleep(wait_seconds)

    print("-" * 50)
    print("Interview complete. Great job!")
    engine.say("Interview complete. Great job!")
    engine.runAndWait()

# 100 Tailored Interview Questions
interview_questions = [
    # --- Behavioral & General Engineering ---
    "Tell me about a time you led a technical project from conception to deployment.",
    "How do you handle disagreements with team members on technical architecture?",
    "Describe a time you had to learn a new technology rapidly to meet a deadline.",
    "What is your approach to debugging a complex issue in an application?",
    "Tell me about a project that failed or didn't meet expectations. What did you learn?",
    "How do you prioritize tasks when working on multiple features or bugs simultaneously?",
    "Describe a situation where you had to explain a complex technical concept to a non-technical stakeholder.",
    "How do you stay updated with the rapidly evolving tech landscape?",
    "Tell me about a time you optimized a slow-performing piece of code or system.",
    "What are the most important principles of writing clean, maintainable code?",
    "Describe your typical Git workflow when collaborating with a team.",
    "How do you handle constructive criticism during code reviews?",
    "Tell me about a time you identified a security vulnerability or potential risk in your software.",
    "What motivates you to solve difficult technical problems?",
    "Describe a time you had to compromise on code quality to meet a tight deadline.",
    "How do you ensure the software you build is accessible and user-friendly?",
    "Tell me about a situation where you lacked clear requirements. How did you proceed?",
    "What is your proudest technical achievement?",
    "How do you approach testing your own code before submitting a pull request?",
    "Where do you see your technical focus shifting in the next two to three years?",

    # --- Python & Django ---
    "What are the key differences between a list and a tuple in Python?",
    "Explain how decorators work in Python and provide a practical use case.",
    "What is the Global Interpreter Lock in Python, and how does it impact concurrency?",
    "How does Python manage memory, and what is the role of garbage collection?",
    "Explain the differences between deep copy and shallow copy in Python.",
    "What are metaclasses in Python, and when would you use them?",
    "How do you handle exceptions in Python? What is the purpose of the finally block?",
    "Explain the architecture of a Django application.",
    "How does Django's ORM work, and how can you optimize database queries with it?",
    "What are Django signals, and what are the risks of overusing them?",
    "Explain the role of middleware in Django. Have you ever written custom middleware?",
    "How do you handle user authentication and authorization in a Django project?",
    "What are Django migrations, and how do you resolve merge conflicts in migration files?",
    "Describe the process of deploying a Django application to a production server.",
    "How do you protect a Django application against common vulnerabilities like Cross-Site Request Forgery?",
    "Explain the difference between select related and prefetch related in Django ORM.",
    "How would you implement background tasks or asynchronous processing in a Django app?",
    "What is the purpose of Django REST Framework, and how does it handle serialization?",
    "How do you manage static and media files in a production Django environment?",
    "Explain the concept of context processors in Django templates.",

    # --- JavaScript & Electron ---
    "Explain the concept of closures in JavaScript with a practical example.",
    "What is the event loop in JavaScript, and how does it handle asynchronous operations?",
    "Describe the differences between var, let, and const.",
    "How does prototypical inheritance work in JavaScript?",
    "Explain the difference between promises and async/await syntax.",
    "What are the common methods for managing state in a modern JavaScript application?",
    "How do you handle cross-origin resource sharing issues in a web application?",
    "Explain the concept of debouncing and throttling in JavaScript.",
    "What is the Document Object Model, and how do modern frameworks optimize manipulating it?",
    "Describe the architecture of an Electron application. What are the Main and Renderer processes?",
    "How do you establish secure communication between the Main and Renderer processes in Electron?",
    "Explain the purpose of Context Isolation and Inter-Process Communication in Electron.",
    "What are the security risks associated with setting node integration to true in Electron?",
    "How do you handle packaging and distributing an Electron application for different operating systems?",
    "Describe how you would debug a memory leak in an Electron Renderer process.",
    "How do you implement native operating system integrations, like system tray icons, in Electron?",
    "Explain the process of configuring and using Electron Forge for application builds.",
    "How do you manage automatic updates in a deployed Electron application?",
    "What strategies do you use to minimize the bundle size and resource footprint of an Electron app?",
    "Describe a challenging bug you encountered while managing window states, like hiding and unhiding, in Electron.",

    # --- AI, LLM Reasoning & Data Annotation ---
    "Explain the fundamental difference between an encoder-only and a decoder-only transformer model.",
    "What is the role of the attention mechanism in Large Language Models?",
    "Describe the process and purpose of Reinforcement Learning from Human Feedback.",
    "How do you evaluate the reasoning capabilities and logic chains of a Large Language Model?",
    "What are the common causes of hallucinations in AI models, and how can they be mitigated?",
    "Explain the concept of Few-Shot Prompting versus Zero-Shot Prompting.",
    "What is Chain-of-Thought prompting, and why does it improve performance on complex tasks?",
    "Describe the principles of high-quality data annotation for fine-tuning AI models.",
    "How do you ensure consistency and reduce bias when annotating conversational data?",
    "What challenges arise when creating datasets for graphical user interface automation agents?",
    "Explain the concept of retrieval-augmented generation and its advantages over standard models.",
    "How do tokenization strategies affect an AI model's ability to process different languages or code?",
    "What is parameter-efficient fine-tuning, and why is it used?",
    "Describe the importance of high-quality prompt design when acting as a reasoning specialist.",
    "How would you structure a dataset intended to teach an AI to follow multi-step, conditional logic?",
    "What metrics beyond perplexity are useful for assessing the practical utility of a text generation model?",
    "Explain how temperature and top-p sampling affect the output generation of a language model.",
    "How do you approach reviewing and correcting AI-generated code for security and performance?",
    "What ethical considerations are most critical when curating training data for foundational models?",
    "How do you balance the trade-off between model harmlessness and helpfulness during alignment?",

    # --- Algorithms, Optimization & Computational Math ---
    "Explain the time and space complexity of Quicksort versus Mergesort.",
    "How does Dijkstra's algorithm find the shortest path, and what are its limitations?",
    "Describe the principles behind Dynamic Programming and when you would use it.",
    "What is a Hash Table, how are collisions resolved, and what is its average-case time complexity?",
    "Explain the concept of a Binary Search Tree and the importance of keeping it balanced.",
    "How do you detect a cycle in a directed graph?",
    "Describe the Particle Swarm Optimization algorithm and its biological inspiration.",
    "What are the key parameters in Particle Swarm Optimization, and how do they affect convergence?",
    "Compare gradient-based optimization algorithms with heuristic methods like Genetic Algorithms.",
    "How do you handle boundary constraints when implementing numerical optimization algorithms?",
    "Explain the concept of local minima versus global minima in an optimization landscape.",
    "What is the fundamental difference between supervised and unsupervised learning algorithms?",
    "Describe how K-Means clustering works and how you determine the optimal number of clusters.",
    "How do Support Vector Machines handle non-linear classification boundaries?",
    "Explain the bias-variance tradeoff in machine learning models.",
    "What is cross-validation, and why is it essential for model evaluation?",
    "Describe the mathematical intuition behind gradient descent.",
    "How do you optimize algorithms for large datasets that do not fit entirely in memory?",
    "What role does linear algebra play in modern computational science and machine learning?",
    "Explain how you would computationally model a complex biological or chemical process."
]

if __name__ == "__main__":
    # Runs the interview loop
    run_interview(interview_questions, wait_minutes=3)