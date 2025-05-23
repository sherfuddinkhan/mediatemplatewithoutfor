import React, { useState } from 'react';
import axios from 'axios';
import Papa from 'papaparse';

const WhatsAppMessageSender1= () => {
  const [csvFile, setCsvFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [status, setStatus] = useState([]);
  const [isSending, setIsSending] = useState(false);

  // Replace with your actual credentials
  const phoneNumberId = '702693576252934';
  const accessToken = 'EAAKFrmuEzYYBO5JFPxNSyInkPmGkB20M1hhZCZCNtFAxURGiENG5WhZAHHH7baZCOOofW0qrSl7YQwvzgeTfjPx5iXPND8KkDqKCZCAxcweEAzUgZCbKQ5YmZAEFoQrm1LqGFeFdIcHxHQMlyUUObTNtUmbphvOZB9aNrv5fRZAPNKDKlZCoqfaPKZBgko3QOfiLubg8t5cagniywDJd9xrSK8CAdN9O6sIieTZAdL3sCipo5Ja539Tv'; // Truncated for security

  // List of static phone numbers to send to before CSV contacts
  const staticNumbers = [
    { phone_number: '919160422485', name: 'Static User 1', order_number: 'ST001' },
    { phone_number: '919542393872', name: 'Static User 2', order_number: 'ST002' },
  ];

  const handleCsvChange = (e) => setCsvFile(e.target.files[0]);
  const handlePdfChange = (e) => setPdfFile(e.target.files[0]);
  const handleImageChange = (e) => setImageFile(e.target.files[0]);

  const uploadMedia = async (file, mediaType) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', mediaType);

    const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/media`;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'multipart/form-data',
    };

    const response = await axios.post(url, formData, { headers });
    return response.data.id;
  };

  const sendPDFTemplateMessage = async (phone, mediaId, name, order) => {
    const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;
    const data = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'template',
      template: {
        name: 'order_invoice1',
        language: { code: 'en' },
        components: [
          {
            type: 'header',
            parameters: [{ type: 'document', document: { id: mediaId, filename: 'Invoice.pdf' } }],
          },
        ],
      },
    };

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    const response = await axios.post(url, data, { headers });
    return response.data.messages?.[0]?.id || 'N/A';
  };

  const sendImageTemplateMessage = async (phone, mediaId, name) => {
    const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;
    const data = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'template',
      template: {
        name: 'promo_image_offer',
        language: { code: 'en' },
        components: [
          {
            type: 'header',
            parameters: [{ type: 'image', image: { id: mediaId } }],
          },
        ],
      },
    };

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    const response = await axios.post(url, data, { headers });
    return response.data.messages?.[0]?.id || 'N/A';
  };

  const sendToRecipients = async (recipients, pdfMediaId, imageMediaId) => {
    for (const recipient of recipients) {
      const phone = recipient.phone_number.trim();
      const name = recipient.name || 'Customer';
      const order = recipient.order_number || 'N/A';

      try {
        if (pdfMediaId) {
          const msgId = await sendPDFTemplateMessage(phone, pdfMediaId, name, order);
          setStatus((prev) => [...prev, { message: `PDF sent to ${phone} (Message ID: ${msgId})`, success: true }]);
        }
        if (imageMediaId) {
          const msgId = await sendImageTemplateMessage(phone, imageMediaId, name);
          setStatus((prev) => [...prev, { message: `Image sent to ${phone} (Message ID: ${msgId})`, success: true }]);
        }
      } catch (err) {
        setStatus((prev) => [...prev, { message: `Error sending to ${phone}: ${err.message}`, success: false }]);
      }
    }
  };

  const handleSendMessages = async () => {
    if (!pdfFile && !imageFile) {
      alert('Upload at least a PDF or Image file.');
      return;
    }

    setIsSending(true);
    setStatus([]);

    try {
      let pdfMediaId = null;
      let imageMediaId = null;

      if (pdfFile) pdfMediaId = await uploadMedia(pdfFile, 'application/pdf');
      if (imageFile) imageMediaId = await uploadMedia(imageFile, 'image/jpeg');

      // Send to static numbers first
      await sendToRecipients(staticNumbers, pdfMediaId, imageMediaId);

      // Parse and send to CSV numbers
      if (csvFile) {
        Papa.parse(csvFile, {
          header: true,
          complete: async (results) => {
            const csvRecipients = results.data.filter(r => r.phone_number?.trim());
            if (!csvRecipients.length) {
              setStatus((prev) => [...prev, { message: 'No valid phone numbers found in CSV.', success: false }]);
            } else {
              await sendToRecipients(csvRecipients, pdfMediaId, imageMediaId);
            }
            setIsSending(false);
            alert('All messages sent.');
          },
          error: (error) => {
            setStatus([{ message: `CSV Error: ${error.message}`, success: false }]);
            setIsSending(false);
          },
        });
      } else {
        setIsSending(false);
        alert('Static messages sent. No CSV uploaded.');
      }
    } catch (error) {
      setStatus([{ message: `Error: ${error.message}`, success: false }]);
      setIsSending(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      <h2>Send WhatsApp Messages</h2>

      <div>
        <label>Upload CSV (.csv with "phone_number"):</label>
        <input type="file" accept=".csv" onChange={handleCsvChange} disabled={isSending} />
      </div>

      <div>
        <label>Upload PDF (optional):</label>
        <input type="file" accept=".pdf" onChange={handlePdfChange} disabled={isSending} />
      </div>

      <div>
        <label>Upload Image (optional):</label>
        <input type="file" accept="image/jpeg,image/png" onChange={handleImageChange} disabled={isSending} />
      </div>

      <button onClick={handleSendMessages} disabled={isSending}>
        {isSending ? 'Sending...' : 'Send Messages'}
      </button>

      <div style={{ marginTop: '20px' }}>
        <h3>Status</h3>
        {status.length > 0 ? (
          <ul>
            {status.map((s, i) => (
              <li key={i} style={{ color: s.success ? 'green' : 'red' }}>{s.message}</li>
            ))}
          </ul>
        ) : (
          <p>No messages sent yet.</p>
        )}
      </div>
    </div>
  );
};

export default WhatsAppMessageSender1;
