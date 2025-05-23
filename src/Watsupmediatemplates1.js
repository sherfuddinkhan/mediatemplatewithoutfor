import React, { useState } from 'react';
import axios from 'axios';
import Papa from 'papaparse';

const WhatsAppMessageSender1 = () => {
  const [csvFile, setCsvFile] = useState(null);
  const [mediaType, setMediaType] = useState('document');
  const [mediaFile, setMediaFile] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [status, setStatus] = useState([]);
  const [isSending, setIsSending] = useState(false);

  const phoneNumberId = '702693576252934';
  const accessToken = 'REPLACE_YOUR_TOKEN'; // Replace with your token securely

  // Handle CSV file upload and parse phone numbers with checkboxes initially checked
  const handleCsvChange = (event) => {
    const file = event.target.files[0];
    setCsvFile(file);
    setStatus([]);
    if (!file) {
      setRecipients([]);
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        // Filter valid rows with phone_number, initialize checked=true
        const rows = result.data.filter(row => row.phone_number && row.phone_number.trim() !== '');
        const withCheckbox = rows.map(row => ({
          phone_number: row.phone_number.trim(),
          checked: true,
        }));
        setRecipients(withCheckbox);
      },
    });
  };

  // Toggle individual recipient checkbox
  const handleCheckboxChange = (index) => {
    setRecipients(prev => {
      const updated = [...prev];
      updated[index].checked = !updated[index].checked;
      return updated;
    });
  };

  // Handle media type selection
  const handleMediaTypeChange = (e) => {
    setMediaType(e.target.value);
    setMediaFile(null);
  };

  // Handle media file upload
  const handleMediaFileChange = (event) => {
    setMediaFile(event.target.files[0]);
  };

  // Upload media to WhatsApp and get media ID
  const uploadMedia = async (file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', type === 'document' ? 'application/pdf' : 'image/jpeg');

    const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/media`;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'multipart/form-data',
    };

    const response = await axios.post(url, formData, { headers });
    return response.data.id;
  };

  // Send template message to a single phone number with media ID
  const sendTemplateMessage = async (phoneNumber, mediaId) => {
    const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;
    const data = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type: 'template',
      template: {
        name: mediaType === 'document' ? 'order_invoice1' : 'promo_image_offer',
        language: { code: 'en' },
        components: [
          {
            type: 'header',
            parameters: [
              mediaType === 'document'
                ? {
                    type: 'document',
                    document: {
                      id: mediaId,
                      filename: 'Invoice.pdf',
                    },
                  }
                : {
                    type: 'image',
                    image: { id: mediaId },
                  },
            ],
          },
        ],
      },
    };

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    const response = await axios.post(url, data, { headers });
    return response.data.messages?.[0]?.id;
  };

  // Send messages to all selected recipients
  const handleSendMessages = async () => {
    if (!mediaFile) {
      alert('Please upload a media file.');
      return;
    }

    const selectedRecipients = recipients.filter(r => r.checked);
    if (selectedRecipients.length === 0) {
      alert('Please select at least one number.');
      return;
    }

    setIsSending(true);
    setStatus([]);

    try {
      const mediaId = await uploadMedia(mediaFile, mediaType);

      for (const recipient of selectedRecipients) {
        try {
          const messageId = await sendTemplateMessage(recipient.phone_number, mediaId);
          setStatus((prev) => [
            ...prev,
            { message: `${mediaType.toUpperCase()} sent to ${recipient.phone_number} (Message ID: ${messageId})`, success: true },
          ]);
        } catch (err) {
          setStatus((prev) => [
            ...prev,
            { message: `Failed to send to ${recipient.phone_number}: ${err.message}`, success: false },
          ]);
        }
      }
    } catch (uploadErr) {
      setStatus([{ message: `Upload failed: ${uploadErr.message}`, success: false }]);
    }

    setIsSending(false);
  };

  return (
    <div style={{ padding: 20, maxWidth: 700, margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h2>Send WhatsApp Template Messages</h2>

      <div style={{ marginBottom: 15 }}>
        <label>
          Upload CSV: &nbsp;
          <input type="file" accept=".csv" onChange={handleCsvChange} disabled={isSending} />
        </label>
      </div>

      <div style={{ marginBottom: 15 }}>
        <label>
          Select Media Type: &nbsp;
          <select value={mediaType} onChange={handleMediaTypeChange} disabled={isSending}>
            <option value="document">Document (PDF)</option>
            <option value="image">Image (JPEG/PNG)</option>
          </select>
        </label>
      </div>

      <div style={{ marginBottom: 15 }}>
        <label>
          Upload {mediaType === 'document' ? 'Document (PDF)' : 'Image (JPEG/PNG)'}: &nbsp;
          <input
            type="file"
            accept={mediaType === 'document' ? 'application/pdf' : 'image/jpeg,image/png'}
            onChange={handleMediaFileChange}
            disabled={isSending}
          />
        </label>
      </div>

      {recipients.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3>Recipients</h3>
          <table border="1" width="100%" cellPadding="5" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Send</th>
                <th>Phone Number</th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((r, index) => (
                <tr key={index}>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={r.checked}
                      onChange={() => handleCheckboxChange(index)}
                      disabled={isSending}
                    />
                  </td>
                  <td>{r.phone_number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <button onClick={handleSendMessages} disabled={isSending || recipients.length === 0}>
          {isSending ? 'Sending...' : 'Send Messages'}
        </button>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Status</h3>
        {status.length > 0 ? (
          <ul>
            {status.map((item, i) => (
              <li key={i} style={{ color: item.success ? 'green' : 'red' }}>
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

export default WhatsAppMessageSender1;
