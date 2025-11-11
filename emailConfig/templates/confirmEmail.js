
const confirmEmail = ((code)=>{
    let confirm = {
        subject: "Verify with this code",
        html: `
        <div id=":161" class="ii gt" jslog="20277; u014N:xr6bB; 1:WyIjdGhyZWFkLWY6MTgwMzE5NzA2MTkwMjYzMzEwMCJd; 4:WyIjbXNnLWY6MTgwMzE5NzA2MTkwMjYzMzEwMCJd">
  <div id=":160" class="a3s aiL msg4298953705539049861"><u></u>
  <div style="padding:0;margin:0;background:#141722">
    <table style="height:100%;width:100%;background-color:#141722" align="center">
      <tbody>
        <tr>
          <td id="m_4298953705539049861dbody" valign="top" style="width:100%;height:100%;padding-top:30px;padding-bottom:30px;background-color:#141722">      
            <table align="center" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;box-sizing:border-box;width:100%;margin:0px auto">
              <tbody>
                <tr>
                  <td valign="top" align="center" style="background-color:#141722;box-sizing:border-box;font-size:0px;text-align:center"><div class="m_4298953705539049861layer_2" style="max-width:600px;display:inline-block;vertical-align:top;width:100%"><table border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%"><tbody><tr><td valign="top" style="padding:20px;box-sizing:border-box;text-align:center">
                  <img src="https://res.cloudinary.com/dxwhz3r81/image/upload/v1719665333/banner-email_akv4ii.png" alt="Image" style="border-width:0px;border-style:none;max-width:2000px;width:100%" width="2000" class="CToWUd a6T" data-bit="iit" tabindex="0"><div class="a6S" dir="ltr" style="opacity: 0.01; left: 1075.62px; top: 143.25px;"><span data-is-tooltip-wrapper="true" class="a5q" jsaction="JIbuQc:.CLIENT"><button class="VYBDae-JX-I VYBDae-JX-I-ql-ay5-ays CgzRE" jscontroller="PIVayb" jsaction="click:h5M12e; clickmod:h5M12e;pointerdown:FEiYhc;pointerup:mF5Elf;pointerenter:EX0mI;pointerleave:vpvbp;pointercancel:xyn4sd;contextmenu:xexox;focus:h06R8; blur:zjh6rb;mlnRJb:fLiPzd;" data-idom-class="CgzRE" jsname="hRZeKc" aria-label="Download attachment " data-tooltip-enabled="true" data-tooltip-id="tt-c16" data-tooltip-classes="AZPksf" id="" jslog="91252; u014N:cOuCgd,Kr2w4b,xr6bB; 4:WyIjbXNnLWY6MTgwMzE5NzA2MTkwMjYzMzEwMCJd; 43:WyJpbWFnZS9qcGVnIl0."><span class="OiePBf-zPjgPe VYBDae-JX-UHGRz"></span><span class="bHC-Q" data-unbounded="false" jscontroller="LBaJxb" jsname="m9ZlFb" soy-skip="" ssk="6:RWVI5c"></span><span class="VYBDae-JX-ank-Rtc0Jf" jsname="S5tZuc" aria-hidden="true"><span class="bzc-ank" aria-hidden="true"><svg viewBox="0 -960 960 960" height="20" width="20" focusable="false" class=" aoH"><path d="M480-336L288-528l51-51L444-474V-816h72v342L621-579l51,51L480-336ZM263.72-192Q234-192 213-213.15T192-264v-72h72v72H696v-72h72v72q0,29.7-21.16,50.85T695.96-192H263.72Z"></path></svg></span></span><div class="VYBDae-JX-ano"></div></button><div class="ne2Ple-oshW8e-J9" id="tt-c16" role="tooltip" aria-hidden="true">Download</div></span></div></td></tr></tbody></table></div></td></tr><tr>
                  <td align="center" valign="top" style="background-color:#141722;box-sizing:border-box;font-size:0px;text-align:center">
                    <div class="m_4298953705539049861layer_2" style="max-width:600px;display:inline-block;vertical-align:top;width:100%">
                      <table style="border-collapse:collapse;width:100%" cellspacing="0" border="0">
                        <tbody>
                          <tr>
                            <td valign="top" style="padding:20px;text-align:left;color:#5f5f5f;font-size:14px;font-family:Helvetica,Arial,sans-serif;direction:ltr;box-sizing:border-box">
                              <p style="text-align:center;margin:0px;padding:0px;color:#616262;font-size:22px;font-family:Helvetica,Arial,sans-serif"><span style="color:#01a854">Confirm your RX Casino email
                              </span></p>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" valign="top" style="background-color:#141722;box-sizing:border-box;font-size:0px;text-align:center">
                    <div class="m_4298953705539049861layer_2" style="max-width:600px;display:inline-block;vertical-align:top;width:100%">
                      <table style="border-collapse:collapse;width:100%" cellspacing="0" border="0">
                        <tbody>
                          <tr>
                            <td valign="top" style="padding:20px;text-align:left;color:#5f5f5f;font-size:14px;font-family:Helvetica,Arial,sans-serif;direction:ltr;box-sizing:border-box">
                              <p style="text-align:center;margin:0px;padding:0px"><span style="color:#b1b6c6">To confirm your RX Casino email address, please copy the code below.<h2 style="color: #01a854;
                                  padding: 10px; text-align: center; font-size:35px;
                                  letter-spacing: 10px;
                                  font-family: 'Courier New', Courier, monospace;">${code}</h2>
                              </span>   
                              </p>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    
                  </td>
                </tr>
                <tr>
                  <td align="center" valign="top" style="background-color:#141722;box-sizing:border-box;font-size:0px;text-align:center">
                  </td>
                </tr>
                
                <tr><td valign="top" align="center" style="background-color:#141722;box-sizing:border-box;font-size:0px;text-align:center">
                  <div class="m_4298953705539049861layer_2" style="max-width:600px;display:inline-block;vertical-align:top;width:100%">
                      <table border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%">
                          <tbody>
                              <tr>
                                  <td valign="top" style="font-size:12px;padding:20px;box-sizing:border-box;text-align:center">
                                      <a href="https://11GCQ.trk.elasticemail.com/tracking/click?d=aZ4RayvWAIT6yptYJ9s56is6QiSCVqA2lYS3-uV_9Kg5qzvoZsCyoGoFL_RAjV7tuDfNsGmgxCmwuURCYw6MzVHxiibK-BOaOM-maa3ioc-NTxhWd5R29N6GKO00dKRUuQ2" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://11GCQ.trk.elasticemail.com/tracking/click?d%3DaZ4RayvWAIT6yptYJ9s56is6QiSCVqA2lYS3-uV_9Kg5qzvoZsCyoGoFL_RAjV7tuDfNsGmgxCmwuURCYw6MzVHxiibK-BOaOM-maa3ioc-NTxhWd5R29N6GKO00dKRUuQ2&amp;source=gmail&amp;ust=1719749179650000&amp;usg=AOvVaw06ex3ABKXt5R5id45wItmW">
                                          <img src="https://res.cloudinary.com/dxwhz3r81/image/upload/v1728555088/rx-casino-logo_s6ncym.png" alt="" style="border-width:0px;border-style:none;max-width:89px;width:100%" width="226" class="CToWUd" data-bit="iit"></a></td></tr></tbody></table></div></td></tr><tr><td valign="top" align="center" style="background-color:#141722;box-sizing:border-box;font-size:0px;text-align:center"><div class="m_4298953705539049861layer_2" style="max-width:600px;display:inline-block;vertical-align:top;width:100%">
                      <table style="border-collapse:collapse;width:100%" cellspacing="0" border="0">
                        <tbody>
                          <tr>
                            <td valign="top" style="padding:20px;text-align:left;color:#5f5f5f;font-size:14px;font-family:Helvetica,Arial,sans-serif;direction:ltr;box-sizing:border-box">
                              <p style="text-align:center;margin:0px;padding:0px"><span style="color:#b1b6c6">Don’t recognize this activity? Please reset your password and contact customer support immediately.</span>
                              </p>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div></td></tr><tr><td valign="top" align="center" style="background-color:#141722;box-sizing:border-box;font-size:0px;text-align:center"><div class="m_4298953705539049861layer_2" style="max-width:600px;display:inline-block;vertical-align:top;width:100%"><table border="0" cellspacing="0" style="border-collapse:collapse;width:100%"><tbody><tr><td valign="top" style="padding:20px"><table align="center" style="margin:0 auto" class="m_4298953705539049861edsocialfollowcontainer" cellpadding="0" border="0" cellspacing="0"><tbody><tr><td><table align="left" border="0" cellpadding="0" cellspacing="0"><tbody><tr><td align="center" valign="middle" style="padding:10px"><a href="https://11GCQ.trk.elasticemail.com/tracking/click?d=-oZ-UbLB_JsVHrVqP9XXW5pyZCdBcbY6iZDeK_UaEdjOCvyD6wFZ898Jq-je23UuEI0ZXqrN_3ArFiTbi5BURzclYw06cKEZZe7Y57cUxfyWmb8Xz2eLpthqjItXWRnlPY5y7xiMtaQ4w5ifyF441Wk1" style="color:#3498db;font-size:14px;font-family:Helvetica,Arial,sans-serif" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://11GCQ.trk.elasticemail.com/tracking/click?d%3D-oZ-UbLB_JsVHrVqP9XXW5pyZCdBcbY6iZDeK_UaEdjOCvyD6wFZ898Jq-je23UuEI0ZXqrN_3ArFiTbi5BURzclYw06cKEZZe7Y57cUxfyWmb8Xz2eLpthqjItXWRnlPY5y7xiMtaQ4w5ifyF441Wk1&amp;source=gmail&amp;ust=1719749179650000&amp;usg=AOvVaw22s0_S3LLKhPhrXdZ8_W4_">
                    </a></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></div></td></tr>
                <tr>
                  <td align="center" valign="top" style="background-color:#141722;box-sizing:border-box;font-size:0px;text-align:center">
                    
                    <div class="m_4298953705539049861layer_2" style="max-width:600px;display:inline-block;vertical-align:top;width:100%">
                      <table style="border-collapse:collapse;width:100%" cellspacing="0" cellpadding="0" border="0">
                        <tbody>
                          <tr>
                            <td valign="top" style="padding:10px">
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    
                  </td>
                </tr>
                <tr>
                  <td align="center" valign="top" style="background-color:#efefef;box-sizing:border-box;font-size:0px;text-align:center">
                    
                    <div class="m_4298953705539049861layer_2" style="max-width:600px;display:inline-block;vertical-align:top;width:100%">
                      <table style="border-collapse:collapse;width:100%" cellspacing="0" border="0">
                        <tbody>
                          <tr>
                            <td valign="top" style="padding:20px;text-align:left;color:#5f5f5f;font-size:14px;font-family:Helvetica,Arial,sans-serif;direction:ltr;box-sizing:border-box">
                              <p style="text-align:center;font-size:10px;margin:0px;padding:0px">Need some help? Feel free to contact us.
                              </p>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  <img src="https://ci3.googleusercontent.com/meips/ADKq_NaaultAf2TKkwq4GJWuZp-8aYNYAp1a5hRgQmorCZlIGBVqOFgcdAsU84uO9AjhOiyuAFZ8BcP4M-Ey3O2AcPKEuZ13xsp92bsx4Fpuhx4irOUKlWT1vtzKxwfcINjpiXgTk55jo1Ni28y0ELndx9yNt2PZEo_bVI26=s0-d-e1-ft#https://11GCQ.trk.elasticemail.com/tracking/open?msgid=dO2e6HjwR2UUSRkbatc0Kw2&amp;c=1807022554490320596" style="width:1px;height:1px" alt="" class="CToWUd" data-bit="iit">
  <a style="display:none" href="https://11GCQ.trk.elasticemail.com/tracking/botclick?msgid=dO2e6HjwR2UUSRkbatc0Kw2&amp;c=1807022554490320596" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://11GCQ.trk.elasticemail.com/tracking/botclick?msgid%3DdO2e6HjwR2UUSRkbatc0Kw2%26c%3D1807022554490320596&amp;source=gmail&amp;ust=1719749179650000&amp;usg=AOvVaw0N6pQcFcO32E0dSzTXqElY">1</a>
</div>
</div>
<div class="yj6qo"></div>
<div class="yj6qo"></div>
</div>
`
    }
    return confirm
}) 

module.exports = confirmEmail