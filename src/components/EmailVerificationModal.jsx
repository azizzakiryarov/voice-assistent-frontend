import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { confirmEmail } from '../api';

export function EmailVerificationModal({ email, onConfirm, onCancel, transcription }) {
  const [editedEmail, setEditedEmail] = useState(email);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      await confirmEmail(editedEmail, transcription);
      onConfirm(editedEmail);
    } catch (err) {
      setError('Det uppstod ett fel vid bekräftelse av mejladressen.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Verifiera e-postadress</h2>
          <button 
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-gray-600 mb-4">
          Vi hittade följande e-postadress i din inspelning. 
          Kontrollera att den är korrekt eller redigera vid behov:
        </p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={editedEmail}
            onChange={(e) => setEditedEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            placeholder="exempel@domän.se"
            required
          />
          
          {error && (
            <div className="text-red-500 text-sm mb-4">
              {error}
            </div>
          )}
          
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>Bekräfta</span>
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Avbryt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}