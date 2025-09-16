# mental-health-app
🧠 Digital Mental Health and Psychological Support System
📌 Problem Statement

Problem Statement ID: 25092
Mental health issues like anxiety, stress, burnout, and depression are rapidly rising among students in higher education. Many students avoid counseling due to stigma or lack of awareness. Institutions also lack centralized systems to track student well-being.

💡 Our Solution

We built a beginner-friendly, web-based platform using Streamlit that provides:

🤖 Rule-based Chatbot – Quick first-aid support for stress, anxiety, burnout, etc.

📚 Resource Hub – Videos, audio guides (including Hindi), and articles for self-help.

📅 Confidential Booking System – Students can schedule counseling sessions securely.

📊 Admin Dashboard – Visual insights on student issues (trends, frequency, recent bookings).

🏗️ Architecture / Flow

Student interacts with Chatbot → gets coping strategies.

Student explores Resources (video/audio/PDF).

Student fills Booking Form → data stored in bookings.csv.

Admin uses Dashboard → see analytics + recent submissions.

🖥️ Technologies Used

Language: Python

Framework: Streamlit (for UI and app structure)

Libraries: Pandas, Matplotlib

Storage: CSV (prototype), scalable to cloud DB in future

🚀 Future Scope

AI-powered chatbot with sentiment analysis (using Hugging Face).

Integration of screening tools like PHQ-9, GAD-7.

Secure cloud database with authentication.

Multi-language support across India.

Mobile app (Flutter/React Native) with offline-first features.
