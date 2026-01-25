# License Strategy

## Overview

Grant uses a **dual-license strategy** to support both open-source community and commercial SaaS offerings.

## Open Source Components (MIT License)

All publicly available packages use the **MIT License**:

- `@grantjs/client` - Browser SDK
- `@grantjs/server` - Server SDK
- `@grantjs/schema` - Type definitions
- `@grantjs/core` - Core RBAC/ACL engine (if published)

### Why MIT?

1. **Business-Friendly**: Allows commercial use, including SaaS offerings
2. **Simple**: Easy to understand and comply with
3. **Widely Adopted**: Trusted by developers and enterprises
4. **Compatible**: Works with most other open-source licenses
5. **Allows Derivatives**: Companies can build proprietary features on top

## Enterprise Features (Proprietary)

Enterprise SaaS features are **not open-source**:

- Advanced analytics and reporting
- SSO integrations (SAML, LDAP, Active Directory)
- SCIM provisioning
- Custom branding and white-labeling
- Advanced compliance features
- Premium support tooling

### Rationale

- **Revenue Protection**: Enterprise features drive SaaS revenue
- **Competitive Advantage**: Differentiates from pure open-source alternatives
- **Investment Recovery**: Recoups development costs for advanced features
- **Quality Control**: Ensures enterprise features meet SLA requirements

## Contributor License Agreement (CLA)

Consider implementing a CLA for contributions:

- **Purpose**: Protects ability to offer commercial licenses
- **Benefits**: Allows dual-licensing without contributor disputes
- **Implementation**: Use tools like CLA Assistant or DCO (Developer Certificate of Origin)

## License Compatibility

### Dependencies

- **MIT Licensed**: Compatible with all dependencies
- **Apache 2.0**: Compatible (can use Apache-licensed dependencies)
- **GPL**: Avoid GPL dependencies (viral license conflicts with proprietary features)

### Distribution

- **npm Packages**: MIT License (public registry)
- **GitHub Repository**: MIT License (public repos)
- **Enterprise Code**: Proprietary (private repository)

## Best Practices

1. **Clear Documentation**: Explicitly state what's open-source vs proprietary
2. **License Headers**: Include license headers in all source files
3. **README Files**: Clearly indicate license in package READMEs
4. **Contributing Guide**: Explain license implications for contributors
5. **Legal Review**: Have legal counsel review license strategy

## Compliance

### For Users

- **Open Source**: Free to use, modify, distribute (with attribution)
- **Enterprise**: Requires subscription and license agreement

### For Contributors

- **Open Source Contributions**: Licensed under MIT (via CLA)
- **Code Review**: All contributions reviewed for license compliance

## Resources

- [MIT License Text](https://opensource.org/licenses/MIT)
- [Open Source Initiative](https://opensource.org/)
- [Choose a License](https://choosealicense.com/)
