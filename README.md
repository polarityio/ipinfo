# Polarity IPInfo Integration

Polarity's IPInfo integration gives users access to automated IPv4 and IPv6 lookups within ipinfo.

ipinfo is a REST based service that provides information about IPv4 and IPv6 addresses.  You can sign up for a paid ipinfo plan to increase your daily lookup limit.  The free plan is limited to 50,000 lookups per month.

| ![](assets/overlay-free.png) | ![](assets/overlay-paid.png)  |
|------------------------------|-------------------------------|
| *Free Example*               | *Business/Enterprise Example* |         

Please see [https://ipinfo.io](https://ipinfo.io) for more information.

## Displayed Information

The information displayed by the integration depends on the level of your API key.  The following table shows the available information displayed for each level of API key:

| Data Type   | Free | Basic   | Standard | Business  | Enterprise |
|-------------|------|---------|----------|-----------|------------|
| Geolocation | ✓    | ✓       | ✓        | ✓         | ✓          |
| ASN         | ✓    | ✓       | ✓        | ✓         | ✓          |
| Privacy     |      |         | ✓        | ✓         | ✓          |
| Company     |      |         |          | ✓         | ✓          |
| Carrier     |      |         |          | ✓         | ✓          |
| Abuse       |      |         |          | ✓         | ✓          |
| Domains     |      |         |          | ✓         | ✓          |



## ipinfo Integration Options

### ipinfo Access Token

Your ipinfo Access Token.  Lookups are throttled to 50000 per month unless you have a paid plan that has a higher limit. An API Key is optional for non-commercial use. 

## Installation Instructions

Installation instructions for integrations are provided on the [PolarityIO GitHub Page](https://polarityio.github.io/).

## Polarity

Polarity is a memory-augmentation platform that improves and accelerates analyst decision making.  For more information about the Polarity platform please see: 

https://polarity.io/
