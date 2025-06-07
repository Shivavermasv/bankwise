import React from 'react';
import Lottie from 'react-lottie'; // Ensure Lottie library is installed
import animationData from '../Loading/Aniki Hamster.json'; // Add your Lottie animation JSON here
import './AboutUs.css'; // Import your custom CSS

const AboutUs = () => {
    const defaultOptions = {
        loop: true,
        autoplay: true,
        animationData: animationData,
        rendererSettings: {
            preserveAspectRatio: 'xMidYMid slice'
        }
    };

    return (
        <div className="about-us-section" style={{ backgroundImage: `url('')`, backgroundSize: 'cover', backgroundBlendMode: 'overlay' }}>
            <div className="about-us-content">
                <h1>About Us</h1>
                <div className="lottie-animation">
                    <Lottie options={defaultOptions} height={200} width={200} />
                </div>
                <p>
                    Welcome to My project! I designed and developed a feature-rich online banking application. Here's what we offer:
                </p>
                <ul>
                    <li>Backend: Developed using <strong>Spring Boot 3</strong> and <strong>PostgreSQL</strong>. Implemented advanced threading concepts and provided multiple user features, ensuring security and efficiency.</li>
                    <li>Frontend: Built with <strong>React.js</strong> using various libraries to create a seamless user experience.</li>
                    <li>API Integration: We offer a range of endpoints for creating accounts, managing transactions, and much more.</li>
                    <li>Future Enhancements: We plan to integrate additional features, further improving functionality and user interaction.</li>
                </ul>
                <p>
                    Interested in exploring our code? Check out the GitHub repository for this project:
                </p>
                <a href="https://github.com/Shivavermasv/onilne_banking_system" target="_blank" rel="noopener noreferrer">GitHub Repository</a>
            </div>
        </div>
    );
}

export default AboutUs;
