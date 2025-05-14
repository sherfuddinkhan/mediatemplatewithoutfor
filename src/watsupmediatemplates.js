import React, { useState } from 'react';
import axios from 'axios';
import Papa from 'papaparse';

const WhatsAppMessageSender = () => {
  const [csvFile, setCsvFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [status, setStatus] = useState([]);
  const [isSending, setIsSending] = useState(false);

  // WhatsApp API credentials (replace with your own)
  const phoneNumberId = '401844556348088';
  const accessToken = 'EAA0TJRMXUXMBOxW2Sa0PSNtIGDwqjRaYw8oORzVm6ulVq1YsZAjXbtfAZCMTIAxnWLCyOBu5jyjd3b0Tm3ZC24LQZCDcYSpaegCIN0LWOttKqBthjZBxNZCNzAIQeIG4xOc8crQS5X6ymxZBLpo3rwmrOx33shIeWAjeNhgweqJL1GIaZCDgRlyp58YEMz2cQtIbLnZCOfRN5lqL0GmJ7t7bjnTIeEsMZD';

  // Handle file input changes
  const handleCsvChange = (event) => {
    setCsvFile(event.target.files[0]);
  };

  const handlePdfChange = (event) => {
    setPdfFile(event.target.files[0]);
  };

  const handleImageChange = (event) => {
    setImageFile(event.target.files[0]);
  };

  // Upload media (PDF or Image) to WhatsApp
  const uploadMedia = async (file, mediaType) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', mediaType); // 'image/jpeg' or 'application/pdf'

    const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/media`;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'multipart/form-data',
    };

    try {
      const response = await axios.post(url, formData, { headers });
      if (response.data && response.data.id) {
        return response.data.id; // Return media_id
      }
      throw new Error('No media ID found in response');
    } catch (error) {
      throw new Error(`Error uploading ${mediaType}: ${error.response?.data?.error?.message || error.message}`);
    }
  };

  // Send PDF template message
  const sendPDFTemplateMessage = async (phoneNumber, mediaId, recipientName, orderNumber) => {
    const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;
    const data = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type: 'template',
      template: {
        name: 'order_invoice',
        language: { code: 'en' },
        components: [
          {
            type: 'header',
            parameters: [
              {
                type: 'document',
                document: {
                  id: mediaId,
                  filename: 'Invoice.pdf',
                },
              },
            ],
          },
          {
            type: 'body',
            parameters: [
              { type: 'text', text: recipientName || 'Customer' },
              { type: 'text', text: orderNumber || 'N/A' },
            ],
          },
        ],
      },
    };

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    try {
      const response = await axios.post(url, data, { headers });
      return { success: true, messageId: response.data.messages?.[0]?.id || 'N/A' };
    } catch (error) {
      throw new Error(`Error sending PDF to ${phoneNumber}: ${error.response?.data?.error?.message || error.message}`);
    }
  };

  // Send Image template message
  const sendImageTemplateMessage = async (phoneNumber, mediaId, recipientName) => {
    const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;
    const data = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type: 'template',
      template: {
        name: 'promo_image_offer',
        language: { code: 'en_US' },
        components: [
          {
            type: 'header',
            parameters: [
              {
                type: 'image',
                image: {
                  id: mediaId,
                },
              },
            ],
          },
          {
            type: 'body',
            parameters: [
              { type: 'text', text: recipientName || 'Customer' },
            ],
          },
        ],
      },
    };

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    try {
      const response = await axios.post(url, data, { headers });
      return { success: true, messageId: response.data.messages?.[0]?.id || 'N/A' };
    } catch (error) {
      throw new Error(`Error sending image to ${phoneNumber}: ${error.response?.data?.error?.message || error.message}`);
    }
  };

  // Parse CSV and send messages
  const handleSendMessages = async () => {
    if (!csvFile || (!pdfFile && !imageFile)) {
      alert('Please upload a CSV file and at least one media file (PDF or Image).');
      return;
    }

    setIsSending(true);
    setStatus([]);

    try {
      // Parse CSV file
      Papa.parse(csvFile, {
        header: true,
        complete: async (result) => {
          const recipients = result.data;
          if (!recipients.length || !recipients[0].phone_number) {
            setStatus([{ message: 'Error: CSV must contain a "phone_number" column.', success: false }]);
            setIsSending(false);
            return;
          }

          // Upload media files
          let pdfMediaId = null;
          let imageMediaId = null;

          if (pdfFile) {
            pdfMediaId = await uploadMedia(pdfFile, 'application/pdf');
          }
          if (imageFile) {
            imageMediaId = await uploadMedia(imageFile, 'image/jpeg');
          }

          // Send messages to each recipient
          for (const recipient of recipients) {
            const phoneNumber = recipient.phone_number?.trim();
            const recipientName = recipient.name || 'Customer';
            const orderNumber = recipient.order_number || 'N/A';

            if (!phoneNumber || !phoneNumber.startsWith('+')) {
              setStatus((prev) => [
                ...prev,
                { message: `Skipped invalid phone number: ${phoneNumber || 'N/A'}`, success: false },
              ]);
              continue;
            }

            try {
              // Send PDF template if PDF is uploaded
              if (pdfMediaId) {
                const result = await sendPDFTemplateMessage(phoneNumber, pdfMediaId, recipientName, orderNumber);
                setStatus((prev) => [
                  ...prev,
                  { message: `PDF sent to ${phoneNumber} (Message ID: ${result.messageId})`, success: true },
                ]);
              }

              // Send Image template if Image is uploaded
              if (imageMediaId) {
                const result = await sendImageTemplateMessage(phoneNumber, imageMediaId, recipientName);
                setStatus((prev) => [
                  ...prev,
                  { message: `Image sent to ${phoneNumber} (Message ID: ${result.messageId})`, success: true },
                ]);
              }
            } catch (error) {
              setStatus((prev) => [...prev, { message: error.message, success: false }]);
            }
          }

          setIsSending(false);
          alert('Message sending completed. Check status for details.');
        },
        error: (error) => {
          setStatus([{ message: `Error parsing CSV: ${error.message}`, success: false }]);
          setIsSending(false);
        },
      });
    } catch (error) {
      setStatus([{ message: `Error: ${error.message}`, success: false }]);
      setIsSending(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Send WhatsApp Template Messages</h2>
      <div style={{ marginBottom: '10px' }}>
        <label>Upload CSV (with "phone_number" column):</label>
        <input type="file" accept=".csv" onChange={handleCsvChange} disabled={isSending} />
      </div>
      <div style={{ marginBottom: '10px' }}>
        <label>Upload PDF (optional):</label>
        <input type="file" accept=".pdf" onChange={handlePdfChange} disabled={isSending} />
      </div>
      <div style={{ marginBottom: '10px' }}>
        <label>Upload Image (optional, JPEG/PNG):</label>
        <input type="file" accept="image/jpeg,image/png" onChange={handleImageChange} disabled={isSending} />
      </div>
      <button onClick={handleSendMessages} disabled={isSending}>
        {isSending ? 'Sending...' : 'Send Messages'}
      </button>
      <div style={{ marginTop: '20px' }}>
        <h3>Status</h3>
        {status.length > 0 ? (
          <ul>
            {status.map((item, index) => (
              <li key={index} style={{ color: item.success ? 'green' : 'red' }}>
                {item.message}
              </li>
            ))}
          </ul>
        ) : (
          <p>No messages sent yet.</p>
        )}
      </div>
    </div>
  );
};

export default WhatsAppMessageSender;