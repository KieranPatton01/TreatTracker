#notification-wrapper {
    position: fixed;
    top: 20px;
    left: 50%; /* Center horizontally */
    transform: translateX(-50%); /* Offset by half its width */
    z-index: 9999;
    width: 90%;
    max-width: 400px;
    pointer-events: none;
}

.snap-header {
    background: white;
    padding: 12px;
    border-radius: 50px;
    display: flex;
    align-items: center;
    box-shadow: 0 4px 15px rgba(0,0,0,0.15);
    transition: transform 0.8s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.5s;
    transform: translateY(0); /* Default visible position */
}

/* This class will be added by JS to hide it */
.snap-header.hidden {
    transform: translateY(-150%) scale(0.9);
    opacity: 0;
}

.snap-profile-pic {
    width: 40px;
    height: 40px;
    margin-right: 12px;
    border-radius: 50%;
    overflow: hidden;
    background: #f0f0f0;
}