import React from 'react';
import Lottie from 'react-lottie';
import animationData from './Aniki Hamster.json';

const Loading = () => {
    const defaultOptions = {
        loop: true,
        autoplay: true,
        animationData: animationData,
        rendererSettings: {
            preserveAspectRatio: 'xMidYMid slice'
        }
    };

    return (
        <div className="loading-container">
            <Lottie options={defaultOptions} height={200} width={200} />
        </div>
    );
};

export default Loading;
