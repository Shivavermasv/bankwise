import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import Lottie from 'react-lottie';
import animationData from './welcome_animation.json';
import Login from './Login/Login';
import Signup from './Signup/Signup';
import './WelcomePage.css'; 

const WelcomePage = () => {
    const [showLogin, setShowLogin] = React.useState(false);
    const [showSignup, setShowSignup] = React.useState(false);

    const animationOptions = {
        loop: true,
        autoplay: true,
        animationData: animationData,
        rendererSettings: {
            preserveAspectRatio: 'xMidYMid slice'
        }
    };

    return (
        <Container className="text-center mt-5">
            <Row>
                <Col>
                    <Lottie options={animationOptions} height={400} width={400} />
                    <h1 className="welcome-text">Welcome to Our Banking App</h1>
                    <Button
                        variant="primary"
                        className="welcome-btn"
                        onClick={() => setShowLogin(true)}
                    >
                        Login
                    </Button>{' '}
                    <Button
                        variant="success"
                        className="welcome-btn"
                        onClick={() => setShowSignup(true)}
                    >
                        Sign Up
                    </Button>
                </Col>
            </Row>
            
            {showLogin && <Login onHide={() => setShowLogin(false)} />}
            {showSignup && <Signup onHide={() => setShowSignup(false)} />}
        </Container>
    );
};

export default WelcomePage;
