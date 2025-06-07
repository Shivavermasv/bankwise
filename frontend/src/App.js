import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import WelcomePage from './components/sub_comp_welcome/WelcomePage';
import TransferMoney from './components/TransferMoney/TransferMoney';
import SearchClients from './components/Search/SearchClients';
import Home from './components/Home/Home';
import ProtectedRoute from './components/ProtectedRoute'; // Import ProtectedRoute component
import 'bootstrap/dist/css/bootstrap.min.css';
import Login from './components/sub_comp_welcome/Login/Login';
function App() {
    const root = document.getElementById("my");
    sessionStorage.setItem("root", root);
    return (
        <Router className="app">
            <div className="app" id="my">
                <Routes >
                    <Route path="/" element={<WelcomePage />} /> {/* Set WelcomePage as the default route */}
                    <Route path='/Login' element={<ProtectedRoute><Login/></ProtectedRoute>}/>
                    <Route path='/Home' element={<ProtectedRoute><Home/></ProtectedRoute>} />
                    <Route path="/TransferMoney" element={<ProtectedRoute><TransferMoney /></ProtectedRoute>} />
                    <Route path="/SearchClients" element={<ProtectedRoute><SearchClients /></ProtectedRoute>} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
