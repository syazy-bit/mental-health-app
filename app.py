import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
import os
from datetime import datetime


# ---------------- Chatbot Logic ---------------- #
def get_bot_response(user_input):
    """Return a predefined response based on keywords in the user input."""
    user_input = user_input.lower()
    responses = {
        "anxiety": (
            "It sounds like you might be feeling anxious. Remember, it's OK to feel this way. "
            "You could try deep breathing or mindfulness exercises. If anxiety persists, consider talking to a counselor."
        ),
        "stress": (
            "Stress can build up when things get overwhelming. Try taking breaks, doing a short walk, "
            "or listening to calming music. Organizing your tasks and keeping a routine can help reduce stress."
        ),
        "burnout": (
            "Burnout happens when you've been overworking for too long. It might help to take some time off, "
            "do something enjoyable (like a hobby or nature walk), and talk with someone supportive."
        ),
        "sleep": (
            "Sleep issues are common under stress. Maintaining a regular sleep schedule and a relaxing bedtime routine (no screens) can help. "
            "If sleeplessness continues, consider talking with a health professional."
        ),
        "depression": (
            "I'm sorry you're feeling down. Talking with someone you trust can help. "
            "Small steps like going for a walk, doing a hobby, or keeping a journal can ease low moods. You are not alone and help is available."
        ),
    }
    for keyword, response in responses.items():
        if keyword in user_input:
            return response
    return (
        "I’m here to listen. It might help to express what you're feeling or try a relaxation technique. "
        "If you’re comfortable, consider reaching out to someone you trust or scheduling a session with a counselor. You’re not alone."
    )


# ---------------- Booking Form ---------------- #
def booking_section():
    st.subheader("Schedule a Counselor Appointment")
    with st.form("booking_form"):
        name = st.text_input("Your Name (optional)")
        category = st.selectbox(
            "Issue Category",
            ["Anxiety", "Stress", "Burnout", "Sleep Issues", "Depression", "Other"],
        )
        date = st.date_input("Preferred Date")
        time = st.time_input("Preferred Time")
        comments = st.text_area("Comments (optional)")
        submitted = st.form_submit_button("Book Appointment")
    if submitted:
        booking = {
            "Timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "Name": name,
            "Category": category,
            "Date": date.strftime("%Y-%m-%d"),
            "Time": time.strftime("%H:%M"),
            "Comments": comments,
        }
        df_new = pd.DataFrame([booking])
        file_exists = os.path.isfile("bookings.csv")
        if not file_exists:
            df_new.to_csv("bookings.csv", index=False)
        else:
            df_new.to_csv("bookings.csv", mode="a", header=False, index=False)
        st.success("Appointment booked successfully ✅")


# ---------------- Resources ---------------- #
def resources_section():
    st.subheader("Mental Wellness Resources")

    st.markdown("### 🎥 Videos")
    st.markdown(
        "- [Mindfulness Meditation in Hindi](https://www.youtube.com/watch?v=HjfQ_0eN3Zc)"
    )
    st.markdown(
        "- [Mental Health Awareness Talk](https://www.youtube.com/watch?v=Q2fFVj89EiQ)"
    )

    st.markdown("### 🎧 Relaxation Audio")
    st.audio(
        "https://d1cy5zxxhbcbkk.cloudfront.net/guided-meditations/Hindi-bodyscan.mp3",
        format="audio/mp3",
    )

    st.markdown("### 📄 Articles & PDFs")
    st.markdown(
        "- [Wellness Tips for Students (PDF)](https://www.montgomeryschoolsmd.org/siteassets/schools/elementary-schools/h-o/barnsleyes/uploadedfiles/mentalhealth2.pdf)"
    )
    st.markdown(
        "- [Managing Stress (IND)](https://www.artofliving.org/in-en/lifestyle/reads/guide-to-stress-management)"
    )
    st.markdown(
        "- [Stress Overview (MedlinePlus)](https://medlineplus.gov/stress.html)"
    )


# ---------------- Admin Dashboard ---------------- #
def admin_section():
    st.subheader("Admin Dashboard")
    try:
        df = pd.read_csv("bookings.csv")
    except FileNotFoundError:
        st.warning("No booking data available yet.")
        return

    st.markdown("### 📊 Bookings by Category")
    counts = df["Category"].value_counts()
    fig, ax = plt.subplots()
    counts.plot(kind="bar", ax=ax, color="skyblue")
    ax.set_xlabel("Issue Category")
    ax.set_ylabel("Number of Bookings")
    ax.set_title("Appointments by Category")
    st.pyplot(fig)

    st.markdown("### 📝 Recent Bookings")
    st.dataframe(df.tail(5))


# ---------------- Main App ---------------- #
st.set_page_config(page_title="Mental Health Support System", layout="wide")

st.sidebar.title("Menu")
page = st.sidebar.radio("Go to", ["Chatbot", "Resources", "Booking", "Dashboard"])

if page == "Chatbot":
    st.title("🤖 AI-Guided First Aid Chatbot")
    if "messages" not in st.session_state:
        st.session_state["messages"] = []
    if user_input := st.chat_input("How are you feeling today?"):
        st.session_state["messages"].append({"role": "user", "content": user_input})
        bot_reply = get_bot_response(user_input)
        st.session_state["messages"].append({"role": "assistant", "content": bot_reply})
    for msg in st.session_state["messages"]:
        st.chat_message(msg["role"]).write(msg["content"])

elif page == "Resources":
    st.title("📚 Resource Hub")
    resources_section()

elif page == "Booking":
    st.title("📅 Confidential Booking Form")
    booking_section()

elif page == "Dashboard":
    st.title("📊 Admin Dashboard")
    admin_section()

