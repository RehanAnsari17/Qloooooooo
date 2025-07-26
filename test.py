import httpx

API_KEY = "apna api key daal bhai"

url = "https://hackathon.api.qloo.com/v2/insights"
params = {
    "filter.type": "urn:entity:place",
    "filter.location.query": "New York",
    "limit": 1
}
headers = {
    "X-Api-Key": API_KEY
}

print(f"Testing Qloo API with key: {API_KEY[:6]}... (truncated)")

try:
    response = httpx.get(url, headers=headers, params=params, timeout=30.0)
    print("Status code:", response.status_code)
    print("Response:", response.text)
except httpx.ReadTimeout:
    print("Request timed out. Try increasing the timeout or check connectivity.")






# import google.generativeai as genai
# genai.configure(api_key="your_real_api_key_here")
# model = genai.GenerativeModel('gemini-pro')
# print(model.generate_content("Hello, recommend me a restaurant in Kolkata").text)
