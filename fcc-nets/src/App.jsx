import React, { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
// ─── Club Logo ───────────────────────────────────────────────
const FCC_LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAAB4CAYAAAA5ZDbSAAAxc0lEQVR42u2dd3hVVfb3P/ucc/vNTU/oIBB6Eekqgog6NlQcbIyi2FEUwV6xd2csWBjbKCCiWBERbAgoRRAFFZDeQiAh5fZ7ynr/uDcRAaf8XlScyfd58pBw72n7u9pee619oB71qEc96lGPetSjHvWoRz3qUY961KMe9ahHPepRj3rUox71+CWo/5UHFREF6Jk/HaWUU0//fwmxImLs4/81EdHqR+iPS6wmIrUay9q1a4tF5HYRmRCJJLv90vfq8Qcjtry8vLGI3CUiZatWbpSvl64SEbFE5NVUKtVrD03XM6a8HgegGdZ3N7nxeLy1iDwiIhWrV22U88+9UXxGJ1OnrXnyiZfJ4kXfSQZvi8jAPc5n1BN9gPpXEekpIi+ISHTZ16vkrDPGiFfvaEKJkxvsIfmhnqLRVnTaWn86+gKZ89lXtUR/KiJ/7t79YtceRNf76d/bDAO6iAwWkRm2ZcunHy+W44+9SAzamYo2Tm6whxTn9ZWcQHfJ9h8ixXl9JT/UUwzaCZRYh/Y+w3nzjdm1RC8XkStXrtxasOf16rX6tzHDdYNcWlpaJCJXisiyeDwlE1+ZLr26nybQ2tJp5+Rn9awjFkokJ9BdCrJ7CbSWbF+a6ILsXuJWHQRaWe1L/mQ//reJEgknRES2i8hfw+Fwl32Y73qt/hW1tdYMjxeRHVu3lsud48ZLiyYDbGhpebSOUpDdW4rz+krId4hAiYT83WTYWWNkyVcrZOUP6+SyS26XwtzeAiUS9BwsRbl9pDCnt/iMzgIt7eL8PtboUffImh83i4iYIjJdRE597LHHPPVavR996+6D9+23G3NFZLiIfGpZtsyft0zOPmOsZPkOtqClHXB3laLcPlKU20cC7q4CraUor49cdsnt8s2yH2RPrFmzUa6/9iFp1qi/QIn4jM5SmNNbinP7Spa3m0Brx6N3NI8/9iKZ8f7c2sNWisht1dWJknqt/r+b4D21tY+IPC4iWysqauTp8VOke9dTBEpMRRsnJ9C9ztR6tI4CJdK6xSC57ZbHZN26zXWEOo4j+8L20p3y8IPPS+cOJ4qijbhoL3kZ056X1UN02jnQymrb6hj73rufldJtFSIicRF5S0SGvPvuu/59CGY92f+M1IqKiqYiMkpEvrAsW76Y/42cf+6Nkp/d04KWllfrVGeGcwLdRaOtuGgvfXudLs8+PUV27arei0jTNGXiy+/InXeMl61byvb6PBaNy+RJ78mggeeJz+gsijYS8nWT4ry+UpjTW/yuLgKt7KC3qznk5Mtl5gfzxbZFRGStiDwoIofsy7X8z5nw3Uj92fRm3rwfskRkiIhMFZHqLVt2ysMPvihdO54kUGJCiVMbAf804CWSF+ohZw4dLTM/mCt2ZsR3R3VVWCY8M0V6dBsiGm0FWkuj4sNl7NX3yw8/rN2nVs+bu0QuHHGzNCg4VKBEvHonKcjutbtAOdDaan3QIPuWm/4mP66usxTzRGTUtm27mu/xzPr/BNl7mq6hQ293i8iRmYBpUzgck2mvz5YTj7tEgp6uFrS004P7k7bqtBONttKhzXFy262PycqV6/Zphjdu2CZ33/mUtG11TB1J+aFeUpDdO+Nj08Ix/JzrZd68JfsketPGbfLwg89L94NPFYP2otFW9hayVrZH72j2P3yYPP/3aVK5KywiEs4kUM7efbpVS/ZvOea/uUQNHTpUnzp1ah/gFODEVNJst3DBcl55+S2mv/epU7qzVHTcWigYVG63C9t2iEZjxK0EOcEQA47sxbBzBnPc8f0JBHx7nX/Rom958flpvP3mR2wv34Hf5cfv9+I4guOkF5CUUui6hmla1MQieA0PRwzoyYgL/8xJg4/E5/P+7JymafHxR18w8ZV3mf3hfHbsKsejeQgGAxiGjmlahMNRTBJ2XiiPQcccpp87fAiDBvXF43XtBGYD05Yv3/Rply7NK//rCM5IrWNZ1mmGYYwzTavjsq9X8dqU93n37dny4/oNNigtyxvUfD5PJtWYJJKIoqPTsVMJQ047mqGnH0f7Dq32On8sGuf96Z/x0otvMuezRUSTCUK+ALUCIiL7fngFmqbjOA7hSBQHh44dSjh72ImcefaJtGjReK9jNmzYyptvzOKNqTP5eun3JOwkQY8fv9+HUopEIkk4FhUHy2nSoBHHHd9fP2vYYPr1647h0rY7jvOKpmk3AbZSSv5bCNaUUo6ILH7t1Q973HDj/damjaU4WFrAHdD8fh+appFMpohEY1hYNG7QgKOPPpQzzjqeIwf2weNx73Xe1as3MGXy+0x9bQY/rFyLhkZWMICua/+U2H1B1zVAEYvFiVsJivLzOf74/pwz/BQGHNkLTft5YOw4DvPnLeG1KR/wwfufs2HTFhSKoN+P1+tBRIjFEkSSUQGcRkWFcsWoc40bb7mEqqqqg3JzczfUjst/A8FKKSUiMm/4sBv6vjx5shTlNNYdcTImOE5KkuQGs+lzaDdOG3osx5/Qn4YNC/c6VzyeYPaH85k08V0+mv0lu2qq8BtefH4fINj23uOlaQoNQRxBAE0pHKVwHNn3dzWNVMokHI/i0lx0796RM84+niFDjqFps4Z7HbNrVzWzPpzHtNc/5PM5i9mxqwIXBoGAH8PQUUpjZ1W59OzWlUVL30glEomOPp9v7W9BsPEbu2AVCgU1TfPZtuNg2zZKU/Tu04WTTh7ISYOPpF37Vvs8cMXy1bw+dSZvTZvN9z+sQRCy/AEKsnNxMufa2wQrlAjhqImpaRheAwWYSRuXbZHl1UHTcHbT9LSvttF1nbxQDiLC0iXf8eXir7n/ngkcc+zhnDXsRI4c2LvOquTlZXPmWSdw5lknsGHDVmZMn8M7b81m6dLvMU0bXRPcyk1OTlZtVYn8VgP+WxOM4zg4joNh6FSGq7ju2ou574Gx+/zujh0VvD99Dq+/9gFfzFtKdSyMz/CSE8oCFI5jY1n2Po/VNEUyaWHpOv17FDOoocFBmgUKNjgGH5fZzFm+CyNp4vEae2mziNQJTSDgJ0sLEIvGeWXS20ye9B6dOpVw8qmD+PPpf6JTp58SWy1aNGbkFWcz8oqzeXr8q1wx6g4KcnIz5/vtq4R+c4J/RrY4FBTkApBIJPF6PSQSKWa8P4fJE99lwZffsK2sDB2dYMC/m7b+84HSNEU8blHYIMA9pzbhlK1bUEvWY5kOjoDud3NRs3w+HtKUa+dWsX1zDQGfge3IPxFK6rQaEVb+sJ5lK57g4Qeeo3OXtgw7ZzBDTjuGRo2LSCZTuN0uiory/6M44NfA755SM00LAI/HzZTJ71PSuh8P3j+BXr27kEykyM3KJjuUBYBl2fv0m3tGxqmkTWGDIE8OLqbNyrXUrClne41FBTq70CmLWOz8eisD53zNa0eGKG6cRSJhoZT6V7EEtm1jOw6BgJecYIhGjYo546wTeOiB52hTMojLLx2HiKCUImWav3vu4XcnuHZQlVLM+nA+hfnFLFj8OtfdcBEDBvZiV7gSTVP/0QPFRHHfcQ1ov34zq8viUBRCuQxEaaAUytBRWT62xoVmc1Zwc788TENH/UdRt05VpILBpwxk9JjhrFwzk2ZNGzHtjVk4tlMnbP/zBO+O7FCAaDTON8tWAnDv/WNo0bQJ0VgsM435Fw+jFNG4Rbf2uRxVvp1U2ER0RdRloPxubAcspWGhYTlg+FyUVaZot7OM7u3ziMatf0uYDEOnsqqa7l27ce31FwKweNFyIuEEubnZB1T28IAi2O11s3rtGvr0PJ2ZM+ZS0qYFk199FMNlYFn2vxx8pcAURffGXipXlxFwG+jA9qSF0TAH03KwNR1bKWyVJtnxuAlv3sUhDVxYqH85b9Q1jVg8QXFxAa9OfZTiBgU8//c36D/gLHaUlaPrP4/K6wn+WTAjaMqDx+PighE3snbNJvoe1o3nnr+HSCwGqH9u9kTQDI0Cj7C5OoErYVEU8rC5IopZlIUKeLEEbKVhK4WjNOK6RmUsRZEbNJcO/4QcpRSWbaPpislTHqWkTQsWfPkNo6+6h9xgLi6X8bsHVQc0wbWRtc/rZceOXZx37g3EonGGnnEc991/DbvCu9B1/V8EQqAc2OnSKS0Nc1C2D8sR1u6KEejQENN0sDUNS9NQSmOb7WBmjvun5ChQmiIci/LshLvo178HZdvLOe+c67Ct9Lz5XwWA9QRnYFkWudkh5n25mGvHPADAtddfwMhLzqG8ugKXy/hFG+1YNlvjYOT6+ao8glQnadMgm827omw1bbK7NiGVckAU2xG2pFIEQ162JMAx7V+MjAzdYFfNLu6+azRn/+UkLMvmkgtvZfXaDQT8fmzHPhCHkgO28sA0LQqy83hqwiT+/uxUAP76+E2c8KeBlFdV4jKMfWi/4DUUCzfE8DYvIorw2aoygh4XzfODrNxWyTZxyOvelFIdvovGcRImnpbFLNgQx6OrffpPl8ugvLqCi0acxY23XArAXePG8877synIzsWyrAN1GDmgS0ts2yEnkM3Vo+9lwZfLcLtdvDzxIbp2akd1OIxh6HuZZ5/XYPW6Kj4nRJt2hVSE43zx9SYKcwO0bJDD2tJKVlVFKO7amJYNc+nYuQFztWx+WFOF32fs5YINw6CiqopjjurHE0/dCsBb02Zzzz1PkRfKwzyAyT3gCRaRdFRqO5w77DrKyirIy89m6rTHKCjIJZ5I7rXKYztC0K0x4aNSVrUtoVPnBsRr4nz62WqwHNo1KSASTvLjqlLaH9KI7T0789SsbWR59l580HWdcCRCh3atmfjqI3g8blb+sJaLL7oFv8/3TwOyeoL/Ay0O+P2sXb+JC8+7Cdu2KWnTgldf+ytCemFgzwyUpiuUaTHu7a18UNSCpn/qQtP2hWzZVk48EqV37xY0HdiBxyo9jHx+FbrloDT1sxUATdNIppLk5GTx+rTHKCzMJRyOcs7Z11FTHcHtch+QQdUfjuDaoCs/J4fpMz9m3K1PAHDEgJ48O+EuqqORn82PNZVWLN3QMBybp6dvZszCJK+4GvFF63a86iniquUpzp1ezjPvbcIN6IZCJH1s7XTIcRws22bSlEdplykyGDXyLr5atpzsrKx9rl4diDD4g8A0LfJDedx73zMc3K09pw09lr+cO5gN67dw67hHKM7JJ5lyiFvgdWWsp1LkBgwqtkd4b3MNolRmCdHBa2jkBl3YjqSnVkA8BV43GBrsrKnhhefu46hBfQF47K//4B8Tp1GQnX/A+90/nAbvHiUHfX4uvuhWvv9uDQC33D6SEcPPpKwqiu7SaV2sSFo/aaPtCC63Rk7QRW7AIMevkx1w4XJrP1s9sgRKGipsNHbWxLjt5ss5/4LTAPjsk4Vcf91D5AZz/jCa+4fTYABxBJfLRTgS5S9nX8vnc18mGMriyaduoYP9JZ0CO+lQpHHtTBevLYGCAFhOWpvtXwiIDA3KI3DVQGHs4SZLNpps8bXniruvAmDL5lKGn3M9hq7Xme4/Ev5wFfi2bRMKBvn62xVcetm9xCu24vtkNGOPqqCl36FsW4K7ByY5rLWiKpYm8BelW4eKKJx6CIzplWTrxgSHNNC4os9anI9vpLKslOHn3MS2bdvxeb1/OHL/cBpcR7JlEfLn8N6bMyjvtZCm7m3YRoiiRhoVYYdYjcljJ2qcPtlN6S7B74E9awQMDapj0KOF4r6jEuwstzA8GgUN3FgxDWPt26z9YhGfzdlJTlboFytH6jX417hpTRFN2Nx4ah5Ne3TDzGmLbsbJznPRuIGLcAKyrBTjTzHxuBWm9fMMpKYgloIGuYonBqcwIyZJG5o2duMPGRh2CjOvCz2O6MzIo0NUxyz0P2i30a9y25m+HKP2B6j9d78sgduiEdLDDBt2AnQ6H7OwDU5uC0gmaNTUQ3aWRnkE2vqTPHyyTcz6aRlQqbQ2a7riyVMs8iRFTUKRn2NQ1NAD8QR2URuSea2gzyj+clofdDuK7MehUkrV9mMZv3ang/ZrkKuUcpRS1m4/plLKAsx9Zascx/nXqzm737RyiBLiytumIhZoLQYQL2iHmdUU5SRp3MSLpsG2KhjUKMH1RzvsioCuAIHqpOKBk2w6ZyUoq0n74sZNPWAlMPNLiOe2xNP2BKJbtnD1A7PQPSGQf9//2na6yvOXfPaiRd9XKaVspVRKKWVnFOJXqf8w9jO5SinlJBKJNh6PZzAQqhXa9NBykJ1+6IxgCV6vpy7daBj/3u04jpDl03l7aYxbLx7N3dMmgaqG3CzYbJAb3EybpIvS0hThiHB19wS7oj5e+DJtnu843uGUgxLsqBQKA9CihRdPoYCnDa6mnXE17g75DbjwqDP5cr1GQQj+XResNEV2dhAAv9+H/JQfU5mMm9avX7d/iMgu4EfTNGcqpRbuNn5yQBIsInpGGo8G3vrxx82BaCSGrhvUFqRHIxE2bdyKz+1Tmqbh9XhZt3YTmzZuo1nzRlRVVuMyjJ+t+YqkI2dd1/daycvPDvLQm5soHnsbXY87jcQPC9BUC4zSalSihrVlCtsBvVQ4opnFBys95Pqhc36SH7c77Ei4+LHKIL9So0mTXHoP6sTmNXGqwj7mTryRVxckKM5LZ600zalLTdZ2QYg4KKUBaSuk6xpmymLmB3Px+7ysWL4arzvd5aBpGvF4glkz52nlFdXHBQJ+OndpS8uWjcaJyOSVK1deCkT2N8lqf2pvRjO/efShlzqOve62JDg67J71cek+PVcl7CSCoFAIKQx8dD+kI2vXbqKiuhrB2e0GFVm+IJF4undod4R8QQzDza5wOZACXHVya2gBLCdV5xUMzQ9OHBsHwU3rIj+bdkRJ4WTkPEWT/CySlsHO6lJAQ8NTd02/y4fH40YpCIdj2Ni4dRcp20RHJysrSDKRIGrGgETmPnQ0vIQCwXQ1iGURTuwEHDtt0RRHHXm0euvtZ/SskHf2uHHjjh83btx+3WZR7UfTLCJSYFn22oM7Ds7asGEr9z04VuXmhrBtu65X55V/vMmFF5+FYfzUP/T9d2uY8OwUQOO22y+nqDi/7ph4PMFDD0zgyqvOo6AwD8dxME2TlT+sY8rk6eyqquSSS4bRs1dnbMvCcRyUgr8+8jxH9O9L7z5dcBzhySf+wWlDT6RhwwLmz13EhBemcOxRA7ls5BkUFOaweVMp9z/wAt9/t5Kbbr6C1q2bkkqlz1daupNXJ7/Hxg2lOLbDwKP6cP4Fp1FYlEdZWTkvPv8Gs2bPoX+/wzhvxKmIpA2zmTJZuOAbXn/tA1BCIBBk7LUj6NW7C+I4zJu3hFtufYSDO3dILf32XTcwQin1oogYmZjlAMkwZQIEESlMJlNV3TqfIiFfN6e6umavntvT/3zBPntx33t3lriNtrK9tHyvz9qVHC47d1Tu9f9z5y4UTTWVd976aK/Pjj7qz/LWmx/W/X3VlTfLunUbRURkwrMvSeMG3SWZTP3smI0bN0nQ31a+Wrxir/Nt27ZdivK7y+F9ztprOwjbtqVrp6Pl7NOv3uezPXDfeFE0kQ9nztvrs2mvTxfItd5+8xNbRObUBqoH8jRJiQgiQkVFFZZlU7ptOy+9NJHx4ydQUVFFPJ7EsmxmzJjFvLlfYts2xxx7BC2aF7JtWxmWZVNWtoOXX36VZ55+nmg0TmVlNZZls2zZct56azq2bXP44b3o2rkDpdt2YFk2sVicN954m5dffpWNmzaTTJhYVrq9pU2blmzZvC1z7p0cNagfbreLWCzOP/4xCQSaNWtKxw6t2bp1O5Zl8+OP65g8+XVM06Jhw2J69mrP8Sf2QylFOBzl6af+TrgmgqZpnD1sMJVVlViWjWlaTJo4hVWr1mDbDiedfBQd2rXhqEF9sSybmTNnM2fOfETg5FOPIT+nsfbeOx9rQMm7737lz3RiqgMqyNr3dEbDMHR+XLOW88+/AAjQs9sRuN3pQOrzOQvwuH0c3q8vtmWRFfLV9S1t3LiJ4cOHAbkUZLfE5TYwDJ0NGzbx+mvvceqpJyKO0LRZEbZjYRg6iYTNeeeMJpqoAPLJygrUVX20bdcK27Hruv3y87NxHAe322De3MV07dqZ4uICRFloSmEYOmXby5jw9ETOPnsoIoLf78EfSAdNlmXy6qR3OPOsMxARcvNCGAZ113v99en4fCHatm2NUoqi4hwc28HlNvh8zgIC/iC9ex+CaabIyvJSXr4LwNemTdAPxP4YqcqMDObkZNOn159IxnQM/adLNmvWhOzsnLrpRVVlNS5XOlAqKipkxHljSMThk4++qKue8LjdBINZdcdomqqbiuiGzsjLL6CyIslbb82qa4sBaNG8KaXby+oyYRvWb0PTNETg1tuu4bRTz+e779YitkEwKwBAcXERw875c+0chzVr1jFgQP/0kqOC7JyczO9qrzl8+/ZtadSoOL1SZVmEw5G62UHDhsXce994pk37AMe22FpazuGHBQGcVMq3X3Oiv64GZ+a3HTt24MuF7/DDD6s5/9yxdQ962cjz6747/skJrN+4Bb8/vStRixbNef7Fh4lEwpS07F9XHVObGPm5HKUlye1y8+DD6bqphYu+JJFMAbBu3XoKCvOpqqoGIDs7i1mzZ7Nh/RZaHNSEZs2a8O70SZx4/IV8vez7uqrNkjatKGmTXux/bcrrfP3NArKzr6676i8tHdq2zX3331rXy/TgA48RjZhoevo+CwvzmDr1WRo1bIQgDOx/JrFYHEAzjOh+dZu/SYbVtm2SyQTRaBhHftKqeDxOKpUmwesLoCs/kskYRaMxVq5czYIFi3H+zZJUx3FYu3YdK1euJBoLo2Umzhs3bsblctGsedP0ZM3lIhqPMPiES9i4YXNGq4p4480nCAZcmKn0PZaV7WDpkmUAHHvcMfQ8ZCDhcOTfupdoNFonAD5fFppWt0kebrebzp3b0ap1M1q3bo5h2HWVmaFQ6I+z2FDbhLVixXd0aHcYpw6+CCXuuvbPJ5+YwNtvzQDg3HPPoFHDPOLx9BxyzZo19O5xLEOHjALHjdJ+alLbs9Cu1kSnTJOTTzqX3j1OYdOmXXUN2tVVNUSjMQoLC+oEzuvJo2x7Jaf/+Qq2bCnFtm0OOqg5A/r3orq6Jq35azfw8EPj024mO5uBR/UmFo/UXXXP+6iFruvceMMdfLPsO3Rd55JLz8Hj+SkVu2nTVmZ+8BmOI1iWla4o+ZU61X4TDU4mk6zfsJPS0iSaclPb4B6LJamsjGS0z8bnd9WZX9OyqImGqQqbmOZPq0GmaRKJRPdprsVxqCgPUxM1sRypiwEi0Sg7d1bUDXBNTZhrxo5g1boPuf/B63ng/icynQkODRrlYztWnTBZltRdS2lQy6mIEA5HfjF/Xl0dIxKJ1bkqj8fAttPf3b59J6tXr0PT1K/egWj8uqbZqUtY+NwecFw/65xXSqEp6hLztdMr27ZpUFzEbbfegKH7mPnBHGLROLZtU1RcyKCj+2FZdibSLUdTWiadqHHtdZcRiVh8/vlCIuG0mUwlTbZs2Ubbtq0zQmJhGC5ycrLo2KmEFSsOqkuH1lTX1N1DMBjg8H69MU0Ll8sgEomSlZXIRPoGRx/TP13W6zjE43Es2657Nk1TdWlWEYdUyqwTyG6HdCHgD9TtdvCHI7jW3GRnZ6Hr6TSe4whKBF3XcbvddRGxbujouk4olI2maYQyxzRp0oQ77rwGgKVLFxII+tF1nT59etKnT8+0qdu8kWXfLuWGhunAze/3M+aadOfBDddXgEqTlhXKoqxsZ11wl5eXyysvv8Ptd4yhqKiQUVdelIl2TeZ/sZArr7ocXdfp1LkDnTp3qHuuTz+ZS5PGJdx0s0ZWVha33Dqm7rP33v2A3JzGddcwdB2v14Ou6xQWFrB+/WZ2lJXTuEkxZ5xxym6BqBtNab+aid7fBKv0HNFC13Q++XguRQ1y+P77lekHdzSi0RizZ32Kbih+WLmajetLad2yMbF4jGTS5NNP5rN8eRAEvF4PNeEwX375NZ9+PJ+mzQupro6ACBs3bua55yYijpf5879C6Uk8Hk9mKwg3H8+ei2VqFBSGmPv5F2zZXE5+fi6OY/Httyv4cuHnXHLRjVx86elkZQXZvr2MRx8Zz/bSKhYt/JodO7ZiuAw0TbFzRwWvv/42P64u5cdV1Vx68Y1cePHpeDxuwjU1TJjwEh9/+hHHHzOMTz75HCU2WzZu4bNPviAWD1NaWko4EmPkpbdyx92jCAR8TH3tTZo2bUbzFo1JpOK7W7X9yvT+zkX7gPWDTxhZ8N6MaQ7oOsQBhYsi8fsDWiKRVI6TxCaFx/CSwsC20r4q4PaTSJn07duJ6uowq1aup3VJM4qLG7Fs6QoqIzs5pEsXkqkULpebjet3EImmOPjgEtweWPLVcoqL8ykrKyc3Nx+Xy41pxmjeoileb5Atmzfh8brxer0EAzmUl1eyZs1qfH4XkXAUcOMyAgSDLjp2PohVq9YRi8bxeN3sqKghO5BLTk4WqVSSysoKSto0YcP6zTRt1oxGDZqxYMFSIsmqTKicrvjTnfTzh4K51ERi2CTQsMWhRqA2HknZN99wp3b3faN3fPbZZy2PPPLIxP5aVdqfq0m1y4U3RcLJe+644zGiNQkMw0XSTDB48FHkF2Rz/vDr2bZ1Jx6Xm4Tt0FI5tNNgowPfK8V774zHcDtEwlGefXoKT4y/i6VfL6FZ04MYdtZYRo3+C2eeeRJLlyzjnGFXM+rKSznhpEOpqKjkycdf4YpRI7jgvGs4b8QwDCNFgwaNaN2mMZs3b+bbb1aTn5/DaX8+iWQywYwZH3Lbjc9gGOmMVyIZp1OnNkya8jAbNq7juxVrWLN6C4f1O4Szh41BbIPLLh3G4Ud04tIL72DGrOe5757xPD3hHhYtWkx2KJ/TTr2CHpqbAiw2ovEDOi4gmUqRn59Di4OaYBgG7du3rov8mzZrwM23XgJwo1Lq/tqxPKBMdG1lglLqXhGpfujh684EArsJ0nqg28CBh7Z46tlXpCiUp6LiMEBZ3KnbXFkdpum5w8gOaRzc/WgM8ujT9xA2btrISScNY82aZXTo2JhLLrmaQ7p1YPg5o0D8nDP8BHr1OIbSbWGCgQBXjR5B02aFHH1MH0ZdMZZrrxvDm9OmM3PmXEq3VFIZ3oRSHsrLt3Lf/Q9SkN0Ry3YARSRRw7XXX8S0aW9w3fW3o+t5XHHZBZhWHBGzbi5r2SnQHJRy0HSLLVu28unHCxh86tFYySqu9WfTGYvJYnCDDXmaIp5I0Kp1Mz767CWACqA0s5apgAjwqlLqqcwY7rdslrafgysnk7obr5Tqp5Q6JPPTTSk1BNiYmSE5tayngBoU23Bo3LiIFStWZb7gJRK2OKhFc1YsX8COHduZ8cFsvHoDLMtGRKeoqBE7duxky7ZyDC2bWBQcRzF12rNYdoxFX83D7wtwyqnHM2bsBfh8XjQtH4/bh9vtQdOK0kMgtZlQndy8EIsWLQdysG1QykUikcRxIlhOBKUU8XiC6kgNti2Ypk1RUSFt2jVh47pNZDdswlLTJo7KOKc6CZdMxGylIqmBSqnOu41NP6XUU5mx269h9a9Rk4WI6Lfffru2u4/OFJe59+UjlAglupfP5i7mpJP+xMknDqV3z840bVLMpo2bGD3qRgry8/F7c+jWrT2NGzegX79ebN2ymfzcPG664Sp69OpA69ZNyc7OYuSl15CfV8CAfoPRFLz79gf87dEXaNK4MeKY+HxefF434qTStUQiaJrC0BVLFn/LrbeN5dC+venauSuGrihpfRB9eh9Gj249SMTjdO3SgcHHH01OKJDe1ScSYfyTLzD0z6fStU9Hvo1F8OraXv6vNn6KmnZ1rVurXR7M7Cf9h5km2b9gwmVvCRMitsOJQR9vfrmUsTc8ylXXns+O8nKefGISsz77ko8+W8zsTxfT9eD2HHP8MSxZtoLTzjyJj+Ys48QhY7h73CUccWQv7rn7GaZNe5/33/+C/PxJdO3ZjumzPuVPfzqC/oP68/nnC1j07UKWLFtJRdVmRPeREMFlGEQicSzbzXU3jsdWcNfdo5k7/ytmffglhw/sznU3jqS6OszN1z1El94duOr687jpnkdY8t161m0p5aHHH+DvL/2D+TM/4YFgFgnbRv3C8Pp8yqhLh2Us36+83vPrFwRkouz5l19y56FPTXjFLgrl6RW2w0jN5EJlowMPiouXwxEaYAIOuS4/NZZF66wgq2oiWCE3IZUilkzgiKJVgyzyDYulFTqihIZ5Pirjbtq0asTXy1biiljomqLGjqEAlzJo6c9ia8IkisWogJ+tMYucM1tx7tg7WPj2S3y7YgNzlmxl+64IPjtKIBBiV00UhY3LrRG3Q3ijMaJYtEDD7c9hXawKFxbbgBa+fF52O+SJw9sY3G67yNUUVeGI9Duip/p4zj+sRCLR1ufzrftv3Iz0l/PWQEKEg0M5PKOlSKHwiIOteQiaFg8W5nDWGTbNBOKWF6VpqGSE1od1x9PuEBLRGP6AH3efkcx+/l7eWraSS7ODrHdSrHa8GKSX9NxOGMurk0Lo4CQY6vNx33s/4D5vAReOuwuW/A3s3lTFhF1fLaTi++/RfCFsSwh5YWnMzZypHi5RFkpPd1kkcnMIAbeIm6WWgy2JA6ba5nev15fMjwYkgYRtk+NYGI6FKQ65tsXjtsGAwTYdXXFiKRuXbiOJCKFWrfB26IaOic9l4u42nDXzp/H0mCn8xXbhYKE5NtgWyrZQjk0ShTgOOA4RFJbu8JeEn+vOfpCyFfNINT+dWM0usnyKJof2JNCoAZKI4TZsamIm/XJjtDxOeD0GXsciAWi2hc82sSyTxG5eSP7XCZZM1KWRrkPsrxzWonhRDEJArhJeihk0O0Hn2PwE22rAMDRSCRNfUSFN+x2GcgQzVo3W/nQiO9dx83n3cp6Zjc/jkHR+LkSyh0/SgYQDjf3CKRVZ3DTiBlweDb3V8STDu0Bz0fzI/hjBIGbKwnBpbK0QhrVMkBho8H5YJ0eli7/fF52PRKO/sgkAFgrP/yDBUtuNL4CBsJp0tBkHjlEON2sWDzguJqGzIKUT7adxTsso23aBx53eJsnl99Fi4AB0twc7XonWbACu3CJuHjGaIzZ4aB0QovZPr/v+Z9CBKls4NFvRZLHJ3SMvx3NQd1RhF5xYJe6sEC0GDkhXf9gOLrdGWbnDyK4xfjjEYF1K8REaVztujlQON2lWXQHvSvn5znmZ5UX5bybYFY3GHRSIUgSBDx2d8WKQB+wChiqbezSTRyyDm10GF/XzYFoerFQSMoXnzQf0w5ubhx2rhpzWeNsM5PGxl+P5uJpBOTq7LOE/afgxgHLL4axcDxsmrmPq/dfi63o6jrcAOxYm2KgRTQ7ri21aKBFiiRQ+w8fp/VxcIwbX2m5OVDb3aSZJIAfhNdGZ6OgEM1XeSlNE08uH+m857tpvfJ31Zw0brCHpGZMAQYTnHIO/i0F+JsVzsrJ53DBJJuG8STZZ7UtocUgH4vEUjXv3JNS8OVYsgmME8XU/l1nP3s7i8d8yPCdAheX8nyJHHahybC4PhZgybhbL3nsKf++LcAArHiO/fXuKD+5MPG7S/vCuhIuactVkix/ROU+zuFszSQA5wDti8IBj4N1Nc1NOTM44+wSAyp07d+7KVE3+97yUA5BoNFocCAS+eOTBFw+65vo77MKcBrplWiigBrhYs7lMWVQDWcAGpbgmYmA3UHx4ZztatWhIzJWLgYVjxvEdOoZ1i6Zz5Yl3cLPkoesWtvzUCOVCUeqY/GAncPHTLjoKMBEO0j0cpLkxEVQmkvdqsDOp82xuDc99/BTZxa1JLX0W5Qlh2RB0qvjqm02ccOcaaiI6t/ssTsSmOkPuG6Jzv+PCmzmn4XKxs2qHXDTibHvC83cZlsVJLpeavj/zzb+7BmfmeioYDG5PwSljrzs/PGrkhdrOqjLHcLkQ0oHKs47BPeLClwm6GokwKWRx8E6HPqOX8/681QQCJo5joXUcRrx8DWNG3MvhcR9+l4Ul/38SqwFxB5r6HLqWurn6vGvRDYFWJ6EkRdCfZNK739H3ulUUxXUmBlIcj004I5DPiME9jrEHueWccOwga8LzdxnA6N+S3N/UB2eKuQ2PUt8Cpz0+/hbrvHPOUDurtjuGy0Ayvut1R+Mqx001CheQsoW7/RY3Ozoj79zI2DvfxxUsxlMQ4rbzR5Oz1qGp3yZm75+H0YCwBZ2yhOqFYR68/HJ8LdpjpTQuumEGw/+2nQs8Bi94kjR3BCtjLW4VF087BlkZC1FL7pFH9DGnz3zWBTyglHos05bym20X8JvvSV7bdyMipwBvXDTiFv25Fyc5BdnFmm3baCLUAI0UXK+ZHIFDNRBUUI3Gw9U2qW45tG7pYvmb2zjXn0KJTnvDh7ObxP5fTDSADRgo1thxYo7FFNtN7z83ZfqiCLImzi05io5iExbIQliOzj2Oi5WSNtEOYLgMdlaVyzFHHWF/+NELBvC4UuqqTBP8b/JCrN+N4D1IPgmYetP1j3rve/AJOzdYoCulUI5DIjNYZ2oOFyoTf8ZsZ+uKL2MOz5g63wU8NLcTnEWKIYYLC4ju9mD/CcG182Qf4Adm2SaTxMW3mo9QJMmlXmGID6xM4ZwAr4rBc46OmTnGyVR8VtTslLPOOMWZPOVRHXhYKXVt7dvffktyfzeCdyc5lUr1c7lcb7zw3JtFF190k+VxeQy/34edqROuQdFWCZdrFv2wSZDeQMWlFJ9biufExbeiOELZjFAWB6v0tCQC6Ch2/AuCm2cIDmTmrqtFMVF03hWDPIRzNIvTDIegI8QlLQDL0HjSMfhKNEKZzR2UrmOaJjXxsH3LTZfrd90zGuAGpdQDvxe5vyvBu5O8Y0d1SWFh6LWvFn3X7bQhI61NW0v1guw8VWuy4xltPkZzuEBZtESI7rb2+LloPOcYfI/iUOUwXNn0UA4eYI1j8Z2dwLMHwUmElrqHTpobC4fvRWOSGMwQjVzgL5rFKcomP2M5vAjb0XhZDN52NEwgmNFaQ9eprK4mKytgPf/S/capQwZFbNu+wDCMqb+HWT5gCK5dE1VK2VOnTg0OHTp0fE1N7NyLRtzE1Gnv2lnebN3jceNk9k+oyUxFhmg2pyubIoQY4MmYzPmi8ZIYfC2KzggXaDatJckaO46Fhr3bnFfHobnuoVLz8qKj87loNASGaRYnKpu8DLEeoBp4VwxeFZ3tko74VUZrbdumKlrpHHFYX5k85a964yaF3+zYUTm8uDjvmwOhz/eAeGHx7stmInIh8PDkie9nj77qLnvnrl1afihHpbfqd7CAMNBYwWnKZrCyKUCII7gzXUpLROMV0ZkvOg2xOULiHCJJvBlfa6H4Trn5XPlYiUFrHP6i2QxSNqHMooc7c50PRec1MVgjigCSLpPTNDRNUVldg9frtsbdcaVxzXUXADwza9asa4499tjogdLEfcC8kbp2CwillF1dXd0mFAo9tnNH5Z+uveYBXn7lTculXHooFFSO46AcIQVEUTRTwsm6w4nKpjgTnOkZf/qDKF4Vg9mi48HmWIkTQPhA+diKQXflMExZHJ4x5ynAjVCFxizRmCY6P4qGF8FLOr2q6XrmfcYx+7hjjtTHP30HB7VstA4Yo5R6Z0+BrSf4F/xy5vcLgDvnzf260bVj72PB4iW23xXQ/X4fju2gREgCcRQNNThBczhJTJqR/n+VMbHrUUx1dN4TgzBwqHI4R1n0UA466V1E3EAZig9E513RWS8KD4JvN2ITiSSRZI3TrqRE7n/gOv3kUwfawPjly5eP69KlS+XvGUz9YQjeLbWJUsopLS0tatCgwc1myrz0jddnu+8Y95isWvOjE3Bn6T5fev/InzQaChQMUg6nKIu2SKY2BAIIq0WjHEWPjHLVbr+yEcV7ovOB6JSK2kNj0+81DifCTuPiBnLdDZfoIy8fhuHSZsdisVsDgcDC3WOJA20sD0iC9wzAMr93BW6OhGNDJ0+azoMPTJC1G9Y5fleW7vd7EUfASb8iJ5pJHfbTHE5TNl0ze+XY/LSEqAOr0XhTdD52NHah8Gd8LEqhdI1EIkUkWeM0KCiWUVcN16+86lyCWb6vgXuUUtNq7/FA09o/DMF7+ubM3/2A62tqoie89uoMHn34eVau+dH2an4tEPSnO74cBzszF/YAfZVwpmbRHQcN+A6NqaLzqaMRyUx3jPSyD0pTxGIJYmbEadKgkVw+6lx95BXDCIX83wGPDFADXpnDHCtzX+pA8bV/WIL3ZbYzf/cHxoTD0cHT353DIw8/x5Jl31ou3HpWVjBdoWo7uyU94GjNwQ/McHTiCMFajc5sbBaJREk6cbtNy1Zq1OjztPNHDCEQ8H4DPHbllY9PfuKJq5IHsjn+r8DUqVP13bcZEpHeIjIpkUgmZ7w/V44aMFwUbUyNtk5esIfkh3pJfqC75Aa6izvQXYxAd8kJdJf8QHfJD/WU/FBPcdHegVZWj4NPlckT35dk0hQR+UJEzuzfv7+xu8v4tfaUrMc+/PMeRHcUkSdFpOrLL76RISdfIS7am4o2Tl5Wmui8PYg1aOcoSqwjjzhHZn4wXyzLFhGZISLH7eNa9cT+XqZ79y15Y7FYMxG5S0S2fbNstZx1xhhx0T6t0Vk9JT/US1y0dxQl1rGDRsi8uV+LiKREZLKI9N3d99cTewATXVNTUyAiN4jIlq+XrpQhJ18hOu1MaG0O6PcX+ezTxSIiSRF5PplMdvml89TjAIy6Mwl+AL7//vt8EblNREoXLVwhn32yWETEFJGJexCr788tBOvxGxO9bVtNoYjcIiJPZ+bU9cT+FxGt/6sg7b8V6n+J6N0SWc6BnqCoRz3qUY961KMe9ahHPepRj3rUox71qEc96lGPetSjHvWoRz1+ffw/qxLSvj5EAnkAAAAASUVORK5CYII=";


// ─── Keys ─────────────────────────────────────────────────────
const SESSIONS_KEY = "fcc-nets-sessions-v4";
const MEMBERS_KEY = "fcc-nets-members-v4";
const PINS_KEY = "fcc-nets-pins-v4";
const RECURRING_KEY = "recurring";
const TEAMS_KEY = "fcc-nets-teams-v4";
const JOINREQS_KEY = "joinrequests";
const AUDITLOG_KEY = "auditlog";

// ─── 2026 Home Match Fixtures (Fredensborg ground only) ───────
// ─── Privacy notice (GDPR) ────────────────────────────────────
const PRIVACY_TEXT = `Fredensborg Cricket Club stores your name, email address, and phone number to manage your club membership and communicate about training, matches, and club activities. Your data is only accessible to club admins and coaches. It is stored securely on Google Firebase servers located in the EU (Frankfurt) and will not be shared with third parties. You have the right to access, correct, or request deletion of your data at any time by contacting the club admin. Data is retained for the duration of your membership and up to one year after. For members under 16, a parent or guardian must provide consent on their behalf.`;

const PRIVACY_SECTIONS = [
  {
    title: "What data we collect",
    body: "We store your full name, email address, and phone number. For youth members (under 16), we also store a link to the parent or guardian who registered on their behalf.",
  },
  {
    title: "Why we collect it",
    body: "To manage your club membership, communicate about training sessions and matches, coordinate car pooling to Karlebo Cricket Ground, and ensure we can reach you or your child's guardian in case of an emergency.",
  },
  {
    title: "Who can see your data",
    body: "Only club admins and coaches can view member contact details. Your data is never shared with third parties, advertisers, or other clubs.",
  },
  {
    title: "Where it is stored",
    body: "All data is stored on Google Firebase (Firestore), hosted in the EU on servers located in Frankfurt, Germany. Google is fully GDPR-compliant as an EU data processor.",
  },
  {
    title: "How long we keep it",
    body: "Your data is kept for the duration of your active club membership and up to one year after you leave. After that it is deleted on request.",
  },
  {
    title: "Your rights",
    body: "You have the right to: access a copy of your data, correct any inaccuracies, request deletion, and withdraw consent at any time. To exercise any of these rights, contact the club admin directly in the app (Profile → Help) or email fredensborgcricket.dk.",
  },
  {
    title: "Children's data",
    body: "For members under 16, we require a parent or guardian to provide consent before we process the child's data. This consent is recorded with a timestamp when the parent completes the account setup flow.",
  },
  {
    title: "Lawful basis",
    body: "We process adult member data under the lawful basis of Legitimate Interests (GDPR Article 6(1)(f)) — running a sports club requires contact information for operational and safety reasons. For children's data we rely on explicit parental consent (Article 6(1)(a) and Article 8).",
  },
  {
    title: "Contact",
    body: "For any data-related queries, contact Reuben Dayal (club admin) via the Help section of this app, or through fredensborgcricket.dk.",
  },
];

// ─── Match Fixtures 2026 (home matches only — blocks nets) ────
// Source: DCF 2026_Turnering_Schedule, 11-Mar-Consolidated
// Away matches excluded — nets not needed for away games
const MATCH_FIXTURES = [
  // ── 2. Division ──────────────────────────────────────────────
  { date: "2026-05-17", from: "10:00", to: "19:00", label: "Div 2 — FCC vs Århus 1" },
  { date: "2026-05-24", from: "11:00", to: "20:00", label: "Div 2 — FCC vs Himalaya 1" },
  { date: "2026-06-07", from: "11:00", to: "20:00", label: "Div 2 — FCC vs Copenhagen 1" },
  { date: "2026-07-26", from: "11:00", to: "20:00", label: "Div 2 — FCC vs Bella 1" },
  { date: "2026-08-15", from: "11:00", to: "20:00", label: "Div 2 — FCC vs Kolding 1" },
  { date: "2026-08-30", from: "11:00", to: "20:00", label: "Div 2 — FCC vs Frem 1" },
  // ── 3. Division Øst - B ──────────────────────────────────────
  { date: "2026-05-02", from: "13:00", to: "21:00", label: "Div 3 — FCC vs APMM 1" },
  { date: "2026-05-31", from: "10:00", to: "19:00", label: "Div 3 — FCC vs Frem 2" },
  { date: "2026-06-13", from: "14:00", to: "21:00", label: "Div 3 — FCC vs Hvidovre 2" },
  { date: "2026-06-27", from: "10:00", to: "19:00", label: "Div 3 — FCC vs Ishøj 3" },
  { date: "2026-08-22", from: "10:00", to: "19:00", label: "Div 3 — FCC vs APMM 1" },
  { date: "2026-09-05", from: "15:00", to: "21:00", label: "Div 3 — FCC vs AB 2" },
  // ── 4. Division Øst ──────────────────────────────────────────
  { date: "2026-05-10", from: "10:00", to: "19:00", label: "Div 4 — FCC vs Tårnby 1" },
  { date: "2026-05-31", from: "15:00", to: "21:00", label: "Div 4 — FCC vs Albertslund 3" },
  { date: "2026-06-14", from: "14:00", to: "21:00", label: "Div 4 — FCC vs Tåstrup 2" },
  { date: "2026-08-01", from: "10:00", to: "19:00", label: "Div 4 — FCC vs Hvidovre 3" },
  { date: "2026-08-09", from: "14:00", to: "21:00", label: "Div 4 — FCC vs Frem 3" },
  // ── Kvinderækken ─────────────────────────────────────────────
  { date: "2026-06-06", from: "10:00", to: "19:00", label: "Women's — FCC vs Esbjerg" },
  { date: "2026-06-14", from: "10:00", to: "19:00", label: "Women's — FCC vs Svanholm" },
  { date: "2026-08-02", from: "10:00", to: "19:00", label: "Women's — FCC vs KB" },
  // ── Oldboys ──────────────────────────────────────────────────
  { date: "2026-05-06", from: "18:00", to: "21:00", label: "OB — FCC vs Køge OB" },
  { date: "2026-05-27", from: "18:00", to: "21:00", label: "OB — FCC vs Hvidovre OB" },
  { date: "2026-06-18", from: "18:00", to: "21:00", label: "OB — FCC vs Forty Øst 1" },
  { date: "2026-08-12", from: "18:00", to: "21:00", label: "OB — FCC vs Tåstrup OB" },
  { date: "2026-08-18", from: "18:00", to: "21:00", label: "OB — FCC vs Svanholm OB" },
  { date: "2026-08-25", from: "18:00", to: "21:00", label: "OB — FCC vs Ishøj OB" },
  { date: "2026-09-03", from: "18:00", to: "21:00", label: "OB — FCC vs Hvidovre OB" },
  // ── T20 Serie 4 ──────────────────────────────────────────────
  { date: "2026-05-03", from: "13:00", to: "21:00", label: "T20 Series 4 — FCC vs Nørrebro 2" },
  { date: "2026-07-05", from: "10:00", to: "18:00", label: "T20 Series 4 — FCC vs AB 2" },
  { date: "2026-08-02", from: "15:00", to: "22:00", label: "T20 Series 4 — FCC vs Tåstrup 1" },
  // ── T20 Serie 5 ──────────────────────────────────────────────
  { date: "2026-05-16", from: "14:00", to: "22:00", label: "T20 Series 5 — FCC vs Himalaya 1" },
  { date: "2026-07-05", from: "14:00", to: "22:00", label: "T20 Series 5 — FCC vs Tårnby 1" },
  { date: "2026-07-11", from: "11:00", to: "19:00", label: "T20 Series 5 — FCC vs Tåstrup 2" },
  // ── U11 Ministævne (home only)
  { date: "2026-08-16", from: "11:00", to: "19:00", label: "U11 — Miniputstævne" },
  // ── U13 ──────────────────────────────────────────────────────
  { date: "2026-05-16", from: "10:00", to: "19:00", label: "U13 — FCC vs Glostrup U13" },
  { date: "2026-05-25", from: "10:00", to: "19:00", label: "U13 — FCC vs Soraner U13" },
  { date: "2026-06-13", from: "10:00", to: "19:00", label: "U13 — FCC vs Svanholm U13" },
  { date: "2026-06-20", from: "13:00", to: "21:00", label: "U13 — FCC vs Roskilde U13" },
  { date: "2026-08-09", from: "10:00", to: "19:00", label: "U13 — FCC vs KB U13" },
  // ── U15 ──────────────────────────────────────────────────────
  { date: "2026-04-26", from: "10:00", to: "19:00", label: "U15 — FCC vs KB U15" },
  { date: "2026-05-23", from: "10:00", to: "19:00", label: "U15 — FCC vs Svanholm U15" },
  { date: "2026-08-16", from: "14:00", to: "21:00", label: "U15 — FCC vs KB U15" },
  { date: "2026-09-05", from: "10:00", to: "19:00", label: "U15 — FCC vs Glostrup U15" },
  // ── U16 ──────────────────────────────────────────────────────
  { date: "2026-08-03", from: "10:00", to: "19:00", label: "U16 — FCC vs Svanholm U16" },
  { date: "2026-08-29", from: "10:00", to: "19:00", label: "U16 — FCC vs Glostrup U16" },
  // ── U18 ──────────────────────────────────────────────────────
  { date: "2026-06-21", from: "10:00", to: "19:00", label: "U18 — FCC vs Svanholm U18" },
  { date: "2026-07-25", from: "10:00", to: "19:00", label: "U18 — FCC vs KB U18" },
  { date: "2026-09-12", from: "10:00", to: "19:00", label: "U18 — FCC vs Glostrup U18" },
];

// ─── All 2026 FCC Fixtures (home + away) — parsed from DCF schedule ─
// All 89 Fredensborg matches. home=true where ground contains Fredensborg.
const ALL_FIXTURES = [
  // ── 2. Division ──────────────────────────────────────────────
  { date: "2026-05-10", label: "Div 2 @ Hvidovre 1", division: "Div 2", home: false },
  { date: "2026-05-17", label: "Div 2 vs Århus 1", division: "Div 2", home: true },
  { date: "2026-05-24", label: "Div 2 vs Himalaya 1", division: "Div 2", home: true },
  { date: "2026-05-31", label: "Div 2 @ Tåstrup 1", division: "Div 2", home: false },
  { date: "2026-06-07", label: "Div 2 vs Copenhagen 1", division: "Div 2", home: true },
  { date: "2026-06-14", label: "Div 2 @ Soraner 2", division: "Div 2", home: false },
  { date: "2026-06-28", label: "Div 2 @ Nørrebro 1", division: "Div 2", home: false },
  { date: "2026-07-26", label: "Div 2 vs Bella 1", division: "Div 2", home: true },
  { date: "2026-08-15", label: "Div 2 vs Kolding 1", division: "Div 2", home: true },
  { date: "2026-08-22", label: "Div 2 @ Ikast-Brande 1", division: "Div 2", home: false },
  { date: "2026-08-23", label: "Div 2 @ Herning 1", division: "Div 2", home: false },
  { date: "2026-08-30", label: "Div 2 vs Frem 1", division: "Div 2", home: true },
  // ── 3. Division Øst - B ──────────────────────────────────────
  { date: "2026-04-26", label: "Div 3 @ AB 2", division: "Div 3", home: false },
  { date: "2026-05-02", label: "Div 3 vs APMM 1", division: "Div 3", home: true },
  { date: "2026-05-10", label: "Div 3 @ Ishøj 3", division: "Div 3", home: false },
  { date: "2026-05-31", label: "Div 3 vs Frem 2", division: "Div 3", home: true },
  { date: "2026-06-13", label: "Div 3 vs Hvidovre 2", division: "Div 3", home: true },
  { date: "2026-06-27", label: "Div 3 vs Ishøj 3", division: "Div 3", home: true },
  { date: "2026-08-02", label: "Div 3 @ Hvidovre 2", division: "Div 3", home: false },
  { date: "2026-08-08", label: "Div 3 @ Frem 2", division: "Div 3", home: false },
  { date: "2026-08-22", label: "Div 3 vs APMM 1", division: "Div 3", home: true },
  { date: "2026-09-05", label: "Div 3 vs AB 2", division: "Div 3", home: true },
  // ── 4. Division Øst ──────────────────────────────────────────
  { date: "2026-05-10", label: "Div 4 vs Tårnby 1", division: "Div 4", home: true },
  { date: "2026-05-17", label: "Div 4 @ Glostrup 3", division: "Div 4", home: false },
  { date: "2026-05-31", label: "Div 4 vs Albertslund 3", division: "Div 4", home: true },
  { date: "2026-06-14", label: "Div 4 vs Tåstrup 2", division: "Div 4", home: true },
  { date: "2026-06-20", label: "Div 4 @ Himalaya 2", division: "Div 4", home: false },
  { date: "2026-07-04", label: "Div 4 @ Nørrebro 2", division: "Div 4", home: false },
  { date: "2026-08-01", label: "Div 4 vs Hvidovre 3", division: "Div 4", home: true },
  { date: "2026-08-09", label: "Div 4 vs Frem 3", division: "Div 4", home: true },
  { date: "2026-08-22", label: "Div 4 @ Copenhagen 2", division: "Div 4", home: false },
  // ── Women's (Kvinderækken) ────────────────────────────────────
  { date: "2026-05-17", label: "Women's @ Horsens Kvinder", division: "Women's", home: false },
  { date: "2026-05-17", label: "Women's @ Aarhus Kvinder", division: "Women's", home: false },
  { date: "2026-05-24", label: "Women's @ Glostrup kvinder", division: "Women's", home: false },
  { date: "2026-06-06", label: "Women's vs Esbjerg Kvinder", division: "Women's", home: true },
  { date: "2026-06-14", label: "Women's vs Svanholm Kvinder", division: "Women's", home: true },
  { date: "2026-08-02", label: "Women's vs KB kvinder", division: "Women's", home: true },
  { date: "2026-08-15", label: "Women's @ Fredericia kvinder", division: "Women's", home: false },
  // ── Oldboys ──────────────────────────────────────────────────
  { date: "2026-05-06", label: "OB vs Køge OB", division: "OB", home: true },
  { date: "2026-05-22", label: "OB @ Tåstrup OB", division: "OB", home: false },
  { date: "2026-05-27", label: "OB vs Hvidovre OB", division: "OB", home: true },
  { date: "2026-06-01", label: "OB @ Svanholm OB", division: "OB", home: false },
  { date: "2026-06-10", label: "OB @ Ishøj OB - 1", division: "OB", home: false },
  { date: "2026-06-18", label: "OB vs Forty Øst 1", division: "OB", home: true },
  { date: "2026-06-24", label: "OB @ Hvidovre OB", division: "OB", home: false },
  { date: "2026-07-02", label: "OB @ Køge OB", division: "OB", home: false },
  { date: "2026-08-12", label: "OB vs Tåstrup OB", division: "OB", home: true },
  { date: "2026-08-18", label: "OB vs Svanholm OB", division: "OB", home: true },
  { date: "2026-08-25", label: "OB vs Ishøj OB - 1", division: "OB", home: true },
  { date: "2026-09-03", label: "OB vs Hvidovre OB", division: "OB", home: true },
  // ── T20 Serie 4 ───────────────────────────────────────────────
  { date: "2026-04-12", label: "T20 Serie 4 @ Frem 1", division: "T20 Serie 4", home: false },
  { date: "2026-04-19", label: "T20 Serie 4 @ Hvidovre 2", division: "T20 Serie 4", home: false },
  { date: "2026-05-03", label: "T20 Serie 4 vs Nørrebro 2", division: "T20 Serie 4", home: true },
  { date: "2026-07-05", label: "T20 Serie 4 vs AB 2", division: "T20 Serie 4", home: true },
  { date: "2026-08-02", label: "T20 Serie 4 vs Tåstrup 1", division: "T20 Serie 4", home: true },
  // ── T20 Serie 5 ───────────────────────────────────────────────
  { date: "2026-04-12", label: "T20 Serie 5 @ Bella 2", division: "T20 Serie 5", home: false },
  { date: "2026-04-18", label: "T20 Serie 5 @ Glostrup 3", division: "T20 Serie 5", home: false },
  { date: "2026-05-16", label: "T20 Serie 5 vs Himalaya 1", division: "T20 Serie 5", home: true },
  { date: "2026-05-25", label: "T20 Serie 5 @ Frem 2", division: "T20 Serie 5", home: false },
  { date: "2026-07-05", label: "T20 Serie 5 vs Tårnby 1", division: "T20 Serie 5", home: true },
  { date: "2026-07-11", label: "T20 Serie 5 vs Tåstrup 2", division: "T20 Serie 5", home: true },
  // ── U11 Ministævner (from latest 11-Mar DCF Excel) ─────────────
  { date: "2026-05-09", label: "U11 — Miniputstævne", division: "U11", home: false },
  { date: "2026-05-31", label: "U11 — Miniputstævne", division: "U11", home: false },
  { date: "2026-06-21", label: "U11 — Miniputstævne", division: "U11", home: false },
  { date: "2026-08-16", label: "U11 — Miniputstævne", division: "U11", home: true },
  { date: "2026-09-20", label: "U11 — Miniputstævne", division: "U11", home: false },
  // ── U13 ──────────────────────────────────────────────────────
  { date: "2026-04-25", label: "U13 @ Svanholm U13", division: "U13", home: false },
  { date: "2026-05-16", label: "U13 vs Glostrup U13", division: "U13", home: true },
  { date: "2026-05-25", label: "U13 vs Soraner U-13", division: "U13", home: true },
  { date: "2026-06-05", label: "U13 @ Roskilde U13", division: "U13", home: false },
  { date: "2026-06-13", label: "U13 vs Svanholm U13", division: "U13", home: true },
  { date: "2026-06-20", label: "U13 vs Roskilde U13", division: "U13", home: true },
  { date: "2026-08-09", label: "U13 vs KB U13", division: "U13", home: true },
  { date: "2026-08-22", label: "U13 @ Soraner U-13", division: "U13", home: false },
  { date: "2026-08-30", label: "U13 @ Glostrup U13", division: "U13", home: false },
  { date: "2026-09-06", label: "U13 @ KB U13", division: "U13", home: false },
  // ── U15 ──────────────────────────────────────────────────────
  { date: "2026-04-26", label: "U15 vs KB U15 - 1", division: "U15", home: true },
  { date: "2026-05-23", label: "U15 vs Svanholm U15 - 1", division: "U15", home: true },
  { date: "2026-06-27", label: "U15 @ Glostrup U15", division: "U15", home: false },
  { date: "2026-07-19", label: "U15 @ Svanholm U15 - 1", division: "U15", home: false },
  { date: "2026-08-16", label: "U15 vs KB U15 - 1", division: "U15", home: true },
  { date: "2026-09-05", label: "U15 vs Glostrup U15", division: "U15", home: true },
  // ── U16 ──────────────────────────────────────────────────────
  { date: "2026-06-28", label: "U16 @ KB U16", division: "U16", home: false },
  { date: "2026-08-03", label: "U16 vs Svanholm U16", division: "U16", home: true },
  { date: "2026-08-05", label: "U16 @ Glostrup U16", division: "U16", home: false },
  { date: "2026-08-07", label: "U16 @ Svanholm U16", division: "U16", home: false },
  { date: "2026-08-29", label: "U16 vs Glostrup U16", division: "U16", home: true },
  { date: "2026-09-06", label: "U16 @ KB U16", division: "U16", home: false },
  // ── U18 ──────────────────────────────────────────────────────
  { date: "2026-04-25", label: "U18 @ KB U18", division: "U18", home: false },
  { date: "2026-05-16", label: "U18 @ Glostrup U18", division: "U18", home: false },
  { date: "2026-06-21", label: "U18 vs Svanholm U18", division: "U18", home: true },
  { date: "2026-07-25", label: "U18 vs KB U18", division: "U18", home: true },
  { date: "2026-08-01", label: "U18 @ Svanholm U18", division: "U18", home: false },
  { date: "2026-09-12", label: "U18 vs Glostrup U18", division: "U18", home: true },
]
// ─── Coach Map (from your Excel "Coach and Mentor" sheet) ─────
const COACH_MAP = {
  "2026-05-09": "Reuben",
  "2026-05-31": "To be planned",
  "2026-06-21": "Reuben",
  "2026-08-16": "Reuben",
  "2026-09-20": "Reuben",
  // You can expand this later with all 80+ coaches from the Excel
  // Example:
  // "2026-04-26": "Zeb",
  // "2026-05-02": "Arun",
};
// Division → app team name mapping for filtering
const DIVISION_TO_TEAM = {
  "Div 2": "Div 2", "Div 3": "Div 3", "Div 4": "Div 4",
  "Women's": "Women's", "U13": "U13", "U15": "U15", "U16": "U18", "U18": "U18",
};
const ROLES = ["superadmin", "admin", "captain", "vicecaptain", "member", "t20captain", "t20vicecaptain"];
const ROLE_META = {
  superadmin: { label: "Super Admin", bg: "#431407", text: "#fdba74", icon: "👑" },
  admin: { label: "Admin", bg: "#1e3a5f", text: "#93c5fd", icon: "👨🏻‍💻" },
  captain: { label: "Captain", bg: "#14532d", text: "#a3e635", icon: "👨‍✈" },
  vicecaptain: { label: "Vice Captain", bg: "#1a3d2b", text: "#6ee7b7", icon: "👷🏻‍♂️" },
  member: { label: "Member", bg: "#374151", text: "#e5e7eb", icon: "🏏" },
  t20captain: { label: "T20 Captain", bg: "#7c1d1d", text: "#fca5a5", icon: "🦸‍♂" },
  t20vicecaptain: { label: "T20 Vice Captain", bg: "#78350f", text: "#fde68a", icon: "🥷🏻" },
};
// Senior teams can have captains/vice captains; youth cannot
// ─── Default teams (loaded from storage, editable by admins) ──
const DEFAULT_TEAMS = [
  { id: "div2", name: "Div 2", senior: true, coaches: [] },
  { id: "div3", name: "Div 3", senior: true, coaches: [] },
  { id: "div4", name: "Div 4", senior: true, coaches: [] },
  { id: "t20s4", name: "T20 Serie 4", senior: true, coaches: [] },
  { id: "t20s5", name: "T20 Serie 5", senior: true, coaches: [] },
  { id: "womens", name: "Women's", senior: true, coaches: ["Arun Krishnamurthy"] },
  { id: "ob", name: "OB", senior: true, coaches: [] },
  { id: "u18", name: "U18", senior: false, coaches: [] },
  { id: "u15", name: "U15", senior: false, coaches: ["Zeb Pirzada"] },
  { id: "u15g", name: "U15 Girls", senior: false, coaches: ["Zeb Pirzada", "Rajesh Muthukumar", "Kuda"] },
  { id: "u13", name: "U13", senior: false, coaches: ["Zeb Pirzada"] },
  { id: "u11", name: "U11", senior: false, coaches: ["Reuben Dayal", "Aniket Sharma", "Nitin Gupta"] },
];

const TEAM_META = {
  "Div 2": { bg: "#14532d", text: "#a3e635" },
  "Div 3": { bg: "#1e3a5f", text: "#93c5fd" },
  "Div 4": { bg: "#3b1f6e", text: "#c4b5fd" },
  "T20 Serie 4": { bg: "#7c1d1d", text: "#fca5a5" },
  "T20 Serie 5": { bg: "#78350f", text: "#fde68a" },
  "Women's": { bg: "#9d174d", text: "#fce7f3", accent: "#fbcfe8", feminine: true },
  "OB": { bg: "#1a3a2a", text: "#86efac" },
  "U18": { bg: "#7c2d12", text: "#fed7aa" },
  "U15": { bg: "#713f12", text: "#fde68a" },
  "U15 Girls": { bg: "#be185d", text: "#fdf2f8", accent: "#fbcfe8", feminine: true },
  "U13": { bg: "#0c4a6e", text: "#bae6fd" },
  "U11": { bg: "#064e3b", text: "#6ee7b7" },
  "Unassigned": { bg: "#374151", text: "#d1d5db" },
};
// Fallback colour pool for dynamically added teams
const EXTRA_COLORS = [
  { bg: "#1a3a2a", text: "#86efac" }, { bg: "#7c3a00", text: "#fdba74" },
  { bg: "#312e81", text: "#a5b4fc" }, { bg: "#065f46", text: "#6ee7b7" },
  { bg: "#1e1b4b", text: "#c7d2fe" }, { bg: "#4c0519", text: "#fda4af" },
];
const getTeamMeta = name => TEAM_META[name] || EXTRA_COLORS[Math.abs([...name].reduce((h, c) => h * 31 + c.charCodeAt(0), 0)) % EXTRA_COLORS.length];

// ─── Colour themes ────────────────────────────────────────────
const THEMES = {
  forest: {
    label: "🌿 Forest Green", emoji: "🌿",
    bg: "#f0fdf4", white: "#fff", green: "#14532d", mid: "#166534",
    lime: "#a3e635", cream: "#fefce8", sand: "#f7fee7",
    text: "#14532d", muted: "#6b7280", border: "rgba(0,0,0,0.09)",
    red: "#dc2626", redBg: "#fee2e2", amber: "#92400e", amberBg: "#fef3c7",
    headerBg: "#14532d",
  },
  navy: {
    label: "⚓ Navy & Gold", emoji: "⚓",
    bg: "#f0f4ff", white: "#fff", green: "#1e3a5f", mid: "#1e40af",
    lime: "#fbbf24", cream: "#fffbeb", sand: "#fef9c3",
    text: "#1e3a5f", muted: "#6b7280", border: "rgba(0,0,0,0.09)",
    red: "#dc2626", redBg: "#fee2e2", amber: "#92400e", amberBg: "#fef3c7",
    headerBg: "#1e3a5f",
  },
  burgundy: {
    label: "🍷 Burgundy & Cream", emoji: "🍷",
    bg: "#fff1f2", white: "#fff", green: "#881337", mid: "#9f1239",
    lime: "#fda4af", cream: "#fff1f2", sand: "#ffe4e6",
    text: "#881337", muted: "#6b7280", border: "rgba(0,0,0,0.09)",
    red: "#dc2626", redBg: "#fee2e2", amber: "#92400e", amberBg: "#fef3c7",
    headerBg: "#881337",
  },
  slate: {
    label: "🌑 Slate & Teal", emoji: "🌑",
    bg: "#f1f5f9", white: "#fff", green: "#0f4c5c", mid: "#0e7490",
    lime: "#22d3ee", cream: "#ecfeff", sand: "#cffafe",
    text: "#0f4c5c", muted: "#6b7280", border: "rgba(0,0,0,0.09)",
    red: "#dc2626", redBg: "#fee2e2", amber: "#92400e", amberBg: "#fef3c7",
    headerBg: "#0f4c5c",
  },
  rose: {
    label: "🌸 Rose & Gold", emoji: "🌸",
    bg: "#fff5f7", white: "#fff", green: "#9d174d", mid: "#be185d",
    lime: "#fbbf24", cream: "#fff0f3", sand: "#ffe4e6",
    text: "#9d174d", muted: "#6b7280", border: "rgba(0,0,0,0.09)",
    red: "#dc2626", redBg: "#fee2e2", amber: "#92400e", amberBg: "#fef3c7",
    headerBg: "#9d174d",
  },
};
const THEME_KEYS = Object.keys(THEMES);
let _themeKey = "navy";
try { _themeKey = localStorage.getItem("fcc-theme") || "navy"; } catch { }
if (!THEMES[_themeKey]) _themeKey = "navy";

const PRESET_POLL = [
  { id: "batting", label: "🏏 Batting Focus" },
  { id: "bowling", label: "🎯 Bowling Focus" },
  { id: "fielding", label: "🧤 Fielding Focus" },
  { id: "mixed", label: "⚡ Mixed" },
];

// Permissions
const CAN = {
  deleteSession: ["superadmin", "admin", "captain", "vicecaptain"],
  removePlayer: ["superadmin", "admin", "captain", "vicecaptain"],
  addOtherPlayer: ["superadmin", "admin", "captain", "vicecaptain"],
  createSession: ["superadmin", "admin", "captain", "vicecaptain", "member"],
  sendReminder: ["superadmin", "admin", "captain", "vicecaptain"],
  accessMembers: ["superadmin", "admin"],
  assignRoles: ["superadmin", "admin"],
  addMember: ["superadmin", "admin"],
  removeMember: ["superadmin", "admin"],
  resetOtherPin: ["superadmin"],
};
const can = (role, action) => (CAN[action] || []).includes(role);
// canOrCoach: coaches (derived from team.coaches[]) get captain-level abilities
// Note: teams param optional — falls back to role check only if not provided
function canOrCoach(role, action, member, teams) {
  if (can(role, action)) return true;
  if (member && teams && ["removePlayer", "addOtherPlayer", "deleteSession", "sendReminder"].includes(action)) {
    return isCoachMember(member.name, teams);
  }
  return false;
}

// 9pm cutoff: after 9pm the night before a session, members can't self-remove
function isAfterCutoff(sessionDateStr) {
  const now = new Date();
  const sessDay = new Date(sessionDateStr + "T00:00:00");
  const cutoff = new Date(sessDay);
  cutoff.setDate(cutoff.getDate() - 1);
  cutoff.setHours(21, 0, 0, 0); // 9pm the day before
  return now >= cutoff;
}

// Roles available to assign based on team type — now uses dynamic seniorTeamNames inside component

// ─── Seed members ─────────────────────────────────────────────
const SEED_MEMBERS = [
  "Aadya Kaul", "Aarin Venkatesh", "Abhinav Singh", "Adam Pirzada",
  "Adithya Manimaran", "Adithya Vennickle", "Advik Akar", "Ahaan Sinha",
  "Ahmed Nawaz", "Akshay Bhardwaj", "Amer Ramzan", "Amit Yadav",
  "Anagha Mahajan", "Anant Mahajan", "Anirudh Ram Sriram", "Ansh Gupta",
  "Anveshak Vujjini", "Abhijit Guhagarkar",
  "Arun Krishnamurthy", "Arun Shankar", "Ashwin Shankar", "Ashwin Singh Tensingh",
  "Balaji R", "Charlie", "Deepak Akar", "Dhruv Shah",
  "Durgesh", "Gagan Sachdeva", "Garghi Seenevas", "Hasnain Ahmed",
  "Ilayaraja Karuppasamy", "Ishan Bordoloi", "Jayashwanth J S", "Jaya Nair",
  "Kamal Jayalaksminarasimhan", "Kian Kakoti", "Mishka Gupta", "Monesh Shantharam",
  "Nimesh Rajamohanan", "Nirmal Mohanan", "Nitin Gupta", "Nitin Jain",
  "Pranavan Aananth", "Prithvi Sagar", "Pronit Lahiri", "Pulin Dhar",
  "Raghavendar Murali", "Rajesh Ayyappan", "Rajesh Muthukumar",
  "Rajkumar Jeyaraman", "Raju Dantuluri", "Ramakrishnan Ravi",
  "Reuben Dayal", "Rewanth Punna", "Rohind Muthuselvaraj",
  "Rohith Arunkumar", "Saatvik Dantuluri", "Sahasra Dantuluri", "Sagar Gupta",
  "Sahil Gagneja", "Samyak Jaggi Ram", "Savir Gagneja", "Senthil Gnanasambandan",
  "Shardul Joshi", "Sharmila C", "Shashank Rastogi", "Shreyas Gujjar",
  "Stalin Natesan", "Sumithra", "Syed Hamza Kazmi",
  "Taarush Jain", "Talat Munshi", "Trineth Arjun", "Vihaan Rastogi",
  "Vihaan Sundeep", "Vijay Deepak", "Vinay Arunkumar",
  "Vinay Kumar", "Virendra Pawar", "Vishali Jain", "Vivek Bhatnagar",
  "Vivek Satyarthi", "Xavier Ramzan", "Yogismaan Kamal", "Zachary Dayal", "Zeb Pirzada",
  "Junaid Khan", "Muhammad Aun Zaheer",
  "Bhoomi Joshi", "Suneeti Bala", "Nandini",
].map((name, i) => ({
  id: `m${i + 1}`,
  name,
  team: name === "Zachary Dayal" ? "U11" : null,
  teams: name === "Zachary Dayal" ? ["U11"]
    : name === "Bhoomi Joshi" ? ["U15 Girls"]
      : name === "Nandini" ? ["U15"]
        : name === "Suneeti Bala" ? ["Women's"]
          : [],
  role: name === "Reuben Dayal" ? "superadmin" : "member",
}));

// ─── Name fix map ─────────────────────────────────────────────
// Maps first-name-only entries to their known full names.
// Entries with duplicate first names (e.g. "Adithya" → 2 people) are
// intentionally excluded — those must be fixed manually via the pencil icon.
const NAME_MAP = {
  "Aadya": "Aadya Kaul", "Aarin": "Aarin Venkatesh", "Abhinav": "Abhinav Singh",
  "Adam": "Adam Pirzada", "Advik": "Advik Akar", "Ahaan": "Ahaan Sinha",
  "Ahmed": "Ahmed Nawaz", "Akshay": "Akshay Bhardwaj", "Amer": "Amer Ramzan",
  "Amit": "Amit Yadav", "Anagha": "Anagha Mahajan", "Anant": "Anant Mahajan",
  "Anirudh": "Anirudh Ram Sriram", "Anshu": "Ansh Gupta",
  "Anveshak": "Anveshak Vujjini", "Abhijit": "Abhijit Guhagarkar",
  "Deepak": "Deepak Akar", "Dhruv": "Dhruv Shah",
  "Gagan": "Gagan Sachdeva", "Garghi": "Garghi Seenevas",
  "Hasnain": "Hasnain Ahmed", "Ilayaraja": "Ilayaraja Karuppasamy",
  "Ishan": "Ishan Bordoloi", "Jaya": "Jaya Nair",
  "Kamal": "Kamal Jayalaksminarasimhan", "Kian": "Kian Kakoti",
  "Mishka": "Mishka Gupta", "Monesh": "Monesh Shantharam",
  "Nimesh": "Nimesh Rajamohanan", "Nirmal": "Nirmal Mohanan",
  "Pranavan": "Pranavan Aananth", "Prithvi": "Prithvi Sagar",
  "Pronit": "Pronit Lahiri", "Pulin": "Pulin Dhar",
  "Raghavendar": "Raghavendar Murali", "Rajkumar": "Rajkumar Jeyaraman",
  "Raju": "Raju Dantuluri", "Ramakrishnan": "Ramakrishnan Ravi",
  "Reuben": "Reuben Dayal", "Rewanth": "Rewanth Punna",
  "Rohind": "Rohind Muthuselvaraj", "Rohith": "Rohith Arunkumar",
  "Saatvik": "Saatvik Dantuluri", "Sahasra": "Sahasra Dantuluri",
  "Sagar": "Sagar Gupta", "Sahil": "Sahil Gagneja",
  "Samyak": "Samyak Jaggi Ram", "Savir": "Savir Gagneja",
  "Senthil": "Senthil Gnanasambandan", "Shardul": "Shardul Joshi",
  "Sharmila": "Sharmila C", "Shashank": "Shashank Rastogi",
  "Shreyas": "Shreyas Gujjar", "Stalin": "Stalin Natesan",
  "Syed": "Syed Hamza Kazmi", "Taarush": "Taarush Jain",
  "Talat": "Talat Munshi", "Trineth": "Trineth Arjun",
  "Vijay": "Vijay Deepak", "Virendra": "Virendra Pawar",
  "Vishali": "Vishali Jain", "Xavier": "Xavier Ramzan",
  "Yogismaan": "Yogismaan Kamal", "Zachary": "Zachary Dayal", "Zeb": "Zeb Pirzada",
  // Session refs use old short names too — include these common session-only names:
  "Rajesh": "Rajesh Muthukumar", // will be overridden for Rajesh Ayyappan if both exist
  // Renamed members — old name → new name:
  "Jay": "Jayashwanth J S",
};
// Names that are ambiguous (multiple people share the first name) — manual fix only:
const AMBIGUOUS_FIRST_NAMES = ["Adithya", "Arun", "Ashwin", "Nitin", "Rajesh", "Vihaan", "Vinay", "Vivek"];

// ─── Division team rosters (from squad lists) ─────────────────
// Maps member names (as stored in Firebase) to their division team.
// Run "Assign Division Teams" in Admin Panel to apply these.
const DIVISION_TEAMS = {
  // Div 2
  "Aarin Venkatesh": "Div 2",
  "Saatvik Dantuluri": "Div 2",
  "Vinay Arunkumar": "Div 2",
  "Dhruv Shah": "Div 2",
  "Ashwin Shankar": "Div 2",
  "Rewanth Punna": "Div 2",
  "Syed Hamza Kazmi": "Div 2",
  "Garghi Seenevas": "Div 2",
  "Rohind Muthuselvaraj": "Div 2",
  "Adithya Manimaran": "Div 2",
  "Anirudh Ram Sriram": "Div 2",
  "Vinay Kumar": "Div 2",
  "Stalin Natesan": "Div 2",
  "Virendra Pawar": "Div 2",
  "Vijay Deepak": "Div 2",
  "Muhammad Aun Zaheer": "Div 2",
  // Div 3
  "Adam Pirzada": "Div 3",
  "Advik Akar": "Div 3",
  "Junaid Khan": "Div 3",
  "Ahmed Nawaz": "Div 3",
  "Prithvi Sagar": "Div 3",
  "Reuben Dayal": "Div 3",
  "Nimesh Rajamohanan": "Div 3",
  "Sahil Gagneja": "Div 3",
  "Deepak Akar": "Div 3",
  "Nitin Jain": "Div 3",
  "Vivek Bhatnagar": "Div 3",
  "Balaji R": "Div 3",
  "Ilayaraja Karuppasamy": "Div 3",
  // Div 4
  "Samyak Jaggi Ram": "Div 4",
  "Abhinav Singh": "Div 4",
  "Xavier Ramzan": "Div 4",
  "Anveshak Vujjini": "Div 4",
  "Amit Yadav": "Div 4",
  "Gagan Sachdeva": "Div 4",
  "Shreyas Gujjar": "Div 4",
  "Nirmal Mohanan": "Div 4",
  "Monesh Shantharam": "Div 4",
  "Shashank Rastogi": "Div 4",
  "Rajkumar Jeyaraman": "Div 4",
  "Sagar Gupta": "Div 4",
  "Vivek Satyarthi": "Div 4",
  "Arun Shankar": "Div 4",
  "Jayashwanth J S": "Div 4",
  "Shardul Joshi": "Div 4",
  "Pronit Lahiri": "Div 4",
};

// ─── Email seed (from uniform order form) ────────────────────
// Used to pre-populate member emails via admin "Seed Emails" button.
// Also used for first-time login verification for members who have no email yet.
const EMAIL_SEED = {
  "Aarin Venkatesh": "aarin.venki@gmail.com",
  "Abhijit Guhagarkar": "gabhijit@yahoo.com",
  "Abhinav Singh": "vcefu1@gmail.com",
  "Adam Pirzada": "pirzada.adam2@gmail.com",
  "Adithya Manimaran": "aadi.manimaran@gmail.com",
  "Advik Akar": "akar.advik@gmail.com",
  "Ahmed Nawaz": "ahmednawaz86@hotmail.com",
  "Amit Yadav": "amit230317@gmail.com",
  "Anirudh Ram Sriram": "iamramsriram@gmail.com",
  "Ansh Gupta": "6anshu1994@gmail.com",
  "Arun Krishnamurthy": "kae.arunkumar@gmail.com",
  "Arun Shankar": "arundynaero@gmail.com",
  "Ashwin Shankar": "ashwin.thewall19@gmail.com",
  "Ashwin Singh Tensingh": "ashwin_singh17@yahoo.com",
  "Balaji R": "balajir136@gmail.com",
  "Deepak Akar": "deepakakar@gmail.com",
  "Dhruv Shah": "activities.dhruv@gmail.com",
  "Durgesh": "durgece66@gmail.com",
  "Gagan Sachdeva": "gagan78639@gmail.com",
  "Garghi Seenevas": "s.garghi@gmail.com",
  "Hasnain Ahmed": "ahmed.hasnain@hotmail.com",
  "Ilayaraja Karuppasamy": "ilayarajak04@gmail.com",
  "Jaya Nair": "jayasundeep@gmail.com",
  "Kamal Jayalaksminarasimhan": "jlkamal@gmail.com",
  "Monesh Shantharam": "ms403@snu.edu.in",
  "Nimesh Rajamohanan": "nimesh.rajamohanan@gmail.com",
  "Nirmal Mohanan": "1983.nirmal@gmail.com",
  "Nitin Gupta": "kotanitin@gmail.com",
  "Nitin Jain": "nitin.niec@gmail.com",
  "Prithvi Sagar": "prithvisagar@gmail.com",
  "Pronit Lahiri": "pronit.lahiri@gmail.com",
  "Rajkumar Jeyaraman": "raj2618@gmail.com",
  "Ramakrishnan Ravi": "ramakrishnan23@gmail.com",
  "Reuben Dayal": "reuben.dayal@gmail.com",
  "Rewanth Punna": "revanthpunna2304@gmail.com",
  "Rohind Muthuselvaraj": "rohind.127@gmail.com",
  "Saatvik Dantuluri": "saatvikvarma33@gmail.com",
  "Sagar Gupta": "gksagar10@gmail.com",
  "Sahil Gagneja": "gagneja808@gmail.com",
  "Samyak Jaggi Ram": "dinesh.pro@gmail.com",
  "Shardul Joshi": "spjoshi99@outlook.com",
  "Shashank Rastogi": "ca.shashankrastogi@gmail.com",
  "Shreyas Gujjar": "shreyasgujjar8@gmail.com",
  "Stalin Natesan": "stalinnatesan@gmail.com",
  "Syed Hamza Kazmi": "s.hamza.kazmi@gmail.com",
  "Talat Munshi": "talatmunshi@gmail.com",
  "Trineth Arjun": "madhanprabu@gmail.com",
  "Vijay Deepak": "vijaydeepak33@gmail.com",
  "Vinay Arunkumar": "kae.arunkumar@gmail.com",
  "Vinay Kumar": "kumarvinay14@gmail.com",
  "Virendra Pawar": "virendra23pawar@gmail.com",
  "Vivek Bhatnagar": "vkbhatnagar@gmail.com",
  "Vivek Satyarthi": "satyarthivivek@gmail.com",
  "Xavier Ramzan": "xavier_ramzan@hotmail.com",
  "Zeb Pirzada": "zpirzada@gmail.com",
  // Added from uniform form — were missing from member list
  "Junaid Khan": "junaidmuhammad395@gmail.com",
  "Muhammad Aun Zaheer": "aunzaheer@hotmail.com",
  "Bhoomi Joshi": "joshi.bhoomi013@gmail.com",
  "Suneeti Bala": "suneeti.bala@gmail.com",
  "Jayashwanth J S": "j.jaayshwaanth@gmail.com",
};
const uid = () => Math.random().toString(36).slice(2, 9);
const localDateStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const todayStr = () => localDateStr();
const tomorrowStr = () => { const d = new Date(); d.setDate(d.getDate() + 1); return localDateStr(d); };
const fmtShort = ds => new Date(ds).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const fmtLong = ds => new Date(ds).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const isToday = ds => ds === todayStr();
const isFuture = ds => { const d = new Date(ds); d.setHours(23, 59, 59); return d >= new Date(); };

// ─── Weather constants ────────────────────────────────────────
const FCC_LAT = 55.917762, FCC_LON = 12.415680;
const WMO = {
  0: { label: "Clear sky", emoji: "☀️", rain: false },
  1: { label: "Mainly clear", emoji: "🌤️", rain: false },
  2: { label: "Partly cloudy", emoji: "⛅", rain: false },
  3: { label: "Overcast", emoji: "☁️", rain: false },
  45: { label: "Fog", emoji: "🌫️", rain: false },
  48: { label: "Rime fog", emoji: "🌫️", rain: false },
  51: { label: "Light drizzle", emoji: "🌦️", rain: true },
  53: { label: "Drizzle", emoji: "🌦️", rain: true },
  55: { label: "Heavy drizzle", emoji: "🌧️", rain: true },
  61: { label: "Light rain", emoji: "🌧️", rain: true },
  63: { label: "Rain", emoji: "🌧️", rain: true },
  65: { label: "Heavy rain", emoji: "🌧️", rain: true },
  71: { label: "Light snow", emoji: "🌨️", rain: false },
  73: { label: "Snow", emoji: "❄️", rain: false },
  75: { label: "Heavy snow", emoji: "❄️", rain: false },
  77: { label: "Snow grains", emoji: "🌨️", rain: false },
  80: { label: "Rain showers", emoji: "🌦️", rain: true },
  81: { label: "Rain showers", emoji: "🌧️", rain: true },
  82: { label: "Violent showers", emoji: "⛈️", rain: true },
  85: { label: "Snow showers", emoji: "🌨️", rain: false },
  86: { label: "Heavy snow showers", emoji: "❄️", rain: false },
  95: { label: "Thunderstorm", emoji: "⛈️", rain: true },
  96: { label: "Thunderstorm+hail", emoji: "⛈️", rain: true },
  99: { label: "Thunderstorm+hail", emoji: "⛈️", rain: true },
};
function wmo(code) { return WMO[code] || { label: "Unknown", emoji: "🌡️", rain: false }; }

// Build rain periods from hourly data for a given date
function calcRainPeriods(hourly, date) {
  if (!hourly?.time) return [];
  const periods = []; let start = null, mmAcc = 0;
  hourly.time.forEach((t, i) => {
    if (!t.startsWith(date)) return;
    const mm = hourly.precipitation[i] || 0;
    const isRain = mm > 0.05;
    if (isRain && start === null) { start = t.slice(11, 16); mmAcc = mm; }
    else if (isRain) { mmAcc += mm; }
    else if (!isRain && start !== null) {
      periods.push({ from: start, to: t.slice(11, 16), mm: +mmAcc.toFixed(1) });
      start = null; mmAcc = 0;
    }
  });
  if (start !== null) periods.push({ from: start, to: "21:00", mm: +mmAcc.toFixed(1) });
  return periods;
}

// ─── Nets timeline helpers ────────────────────────────────────
const NET_COLORS = {
  "1": { bar: "#14532d", label: "#a3e635", barBg: "#f0fdf4", borderFree: "#bbf7d0", freeText: "#86efac" },
  "2": { bar: "#1e3a8a", label: "#bfdbfe", barBg: "#eff6ff", borderFree: "#bfdbfe", freeText: "#93c5fd" },
};
const PRIME_ZONES = [{ from: "17:00", to: "20:00" }, { from: "09:00", to: "13:00" }];

// ─── Car pool stops (Copenhagen → Karlebo corridor) ───────────
const CARPOOL_STOPS = ["Nørrebro", "Brønshøj", "Nørreport", "Lyngby St", "Kokkedal St", "Other"];

// Normalise lift data — handles old string format & new object format
function getLiftObj(d) {
  if (!d) return { pref: "", seats: 1, stop: "", stopOther: "", note: "", saved: false };
  if (typeof d === "string") return { pref: d, seats: 1, stop: "", stopOther: "", note: "", saved: true };
  return d;
}
function getLiftPref(d) { return getLiftObj(d).pref || ""; }
const NET_DAY_START = 8 * 60, NET_DAY_END = 21 * 60, NET_SPAN = NET_DAY_END - NET_DAY_START;
const netPct = m => Math.max(0, Math.min(100, (m - NET_DAY_START) / NET_SPAN * 100));
const toMinsNet = t => { const [h, mn] = t.split(":").map(Number); return h * 60 + mn; };
function isPrimeTime(fromStr, dateStr) {
  const m = toMinsNet(fromStr);
  const isWeekend = dateStr ? new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 6 : false;
  if (isWeekend) {
    return m >= toMinsNet("09:00") && m < toMinsNet("13:00");
  }
  return m >= toMinsNet("17:00") && m < toMinsNet("20:00");
}
function netAvailGauge(sessions, date) {
  const span = NET_DAY_END - NET_DAY_START;
  const booked = (net) => sessions
    .filter(s => s.date === date && (s.net === net || s.net === "both"))
    .reduce((a, s) => {
      const sf = Math.max(toMinsNet(s.from), NET_DAY_START);
      const st = Math.min(toMinsNet(s.to), NET_DAY_END);
      return a + Math.max(0, st - sf);
    }, 0);
  const bp = ((booked("1") + booked("2")) / (span * 2)) * 100;
  if (bp === 0) return { pct: 0, color: "#22c55e" };
  if (bp < 30) return { pct: bp, color: "#84cc16" };
  if (bp < 60) return { pct: bp, color: "#f59e0b" };
  return { pct: bp, color: "#ef4444" };
}

// Normalise member — migrate old single `team` field to `teams` array
// Known coaches — isCoach:true seeded on these members
// normMember — never stores isCoach; derived dynamically from team.coaches[]
const normMember = m => ({
  ...m,
  teams: m.teams || (m.team ? [m.team] : []),
});

// getCoachTeams(name, teams) — returns team names where this person is listed as coach
function getCoachTeams(name, teams) {
  return (teams || []).filter(t => (t.coaches || []).includes(name)).map(t => t.name);
}
// isCoachMember(name, teams) — true if they coach any team
function isCoachMember(name, teams) {
  return (teams || []).some(t => (t.coaches || []).includes(name));
}

// isAbsent(member, dateStr) — true if member has an absence covering this date
function isAbsent(member, dateStr) {
  return (member?.absences || []).some(a => a.from <= dateStr && a.to >= dateStr);
}

// ─── Profile completion ────────────────────────────────────────
function profileCompletion(m) {
  const fields = [!!m?.email?.trim(), !!m?.phone?.trim()];
  const filled = fields.filter(Boolean).length;
  const pct = Math.round((filled / fields.length) * 100);
  // Needs reconfirm if confirmed > 6 months ago or never
  const sixMonthsMs = 6 * 30 * 24 * 60 * 60 * 1000;
  const confirmedAt = m?.profileConfirmedAt ? new Date(m.profileConfirmedAt) : null;
  const needsReconfirm = !confirmedAt || (Date.now() - confirmedAt.getTime() > sixMonthsMs);
  const isComplete = pct === 100 && !needsReconfirm;
  return { pct, filled, total: fields.length, needsReconfirm, isComplete, confirmedAt };
}

// SVG arc dial
function ProfileDial({ pct }) {
  const r = 36, cx = 44, cy = 44, stroke = 7;
  const circumference = Math.PI * r; // half circle
  const arc = circumference * (pct / 100);
  const color = pct === 100 ? "#16a34a" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <svg width="88" height="54" viewBox="0 0 88 54">
      {/* Track */}
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="#e5e7eb" strokeWidth={stroke} strokeLinecap="round" />
      {/* Fill */}
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${arc} ${circumference}`} />
      {/* % text */}
      <text x={cx} y={cy - 4} textAnchor="middle"
        style={{ fontSize: 15, fontWeight: 900, fontFamily: "'DM Sans',sans-serif", fill: color }}>
        {pct}%
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle"
        style={{
          fontSize: 9, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", fill: "#94a3b8",
          letterSpacing: 1, textTransform: "uppercase"
        }}>
        complete
      </text>
    </svg>
  );
}
function hashPin(pin) {
  let h = 5381;
  for (let i = 0; i < pin.length; i++) h = ((h << 5) + h) + pin.charCodeAt(i);
  return String(h >>> 0);
}

function makeICS(s) {
  const [y, mo, da] = s.date.split("-").map(Number);
  const [fh, fm] = s.from.split(":").map(Number);
  const [th, tm] = s.to.split(":").map(Number);
  const p = n => String(n).padStart(2, "0");
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//FCC//EN", "BEGIN:VEVENT",
    `DTSTART:${y}${p(mo)}${p(da)}T${p(fh)}${p(fm)}00`,
    `DTEND:${y}${p(mo)}${p(da)}T${p(th)}${p(tm)}00`,
    `SUMMARY:FCC Training – ${fmtShort(s.date)}`,
    `DESCRIPTION:Players: ${s.players.join(", ")}${s.note ? "\\nNote: " + s.note : ""}`,
    "LOCATION:Karlebo Cricket Ground",
    "END:VEVENT", "END:VCALENDAR"].join("\r\n");
}
const dlICS = s => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([makeICS(s)], { type: "text/calendar" }));
  a.download = `fcc-nets-${s.date}.ics`; a.click();
};

function waMsg(sessions, date) {
  const day = sessions.filter(s => s.date === date && isFuture(s.date));
  if (!day.length) return null;
  let m = `🏏 *FCC Training – ${fmtLong(date)}*\n\n`;
  day.forEach(s => {
    m += `⏰ *${s.from} – ${s.to}*${s.label ? " · _" + s.label + "_" : ""}\n`;
    s.players.forEach(p => m += `• ${p}\n`);
    if (s.note) m += `📋 _${s.note}_\n`;
    m += "\n";
  });
  return m + "See you at Karlebo! 🙌";
}

// G is now set dynamically from theme — see App() below
let G = THEMES[_themeKey];

const iSt = (extra = {}) => ({
  width: "100%", borderRadius: 9, border: `1.5px solid ${G.border}`,
  padding: "11px 13px", fontSize: 15, fontFamily: "'DM Sans',sans-serif",
  fontWeight: 500, background: G.cream, color: G.text,
  outline: "none", boxSizing: "border-box", ...extra,
});

// ─── Atoms ────────────────────────────────────────────────────
const RolePill = ({ role }) => {
  const m = ROLE_META[role] || ROLE_META.member;
  return <span style={{
    background: m.bg, color: m.text, borderRadius: 20, padding: "2px 9px",
    fontSize: 11, fontWeight: 800
  }}>{m.icon} {m.label}</span>;
};

const TeamPill = ({ team, sm }) => {
  const m = getTeamMeta(team || "Unassigned");
  return <span style={{
    background: m.bg, color: m.text, borderRadius: 20,
    padding: sm ? "1px 7px" : "2px 9px", fontSize: sm ? 10 : 11, fontWeight: 800
  }}>{team || "Unassigned"}</span>;
};

const Toast = ({ msg }) => (
  <div style={{
    position: "fixed", bottom: 88, left: "50%", transform: "translateX(-50%)",
    background: G.green, color: G.lime, borderRadius: 30, padding: "9px 22px",
    fontSize: 14, fontWeight: 800, zIndex: 9999, whiteSpace: "nowrap",
    boxShadow: "0 6px 24px rgba(0,0,0,.22)"
  }}>
    {msg}
  </div>
);

const SLbl = ({ children, mt = 16 }) => (
  <div style={{
    fontSize: 13, fontWeight: 900, letterSpacing: .5, textTransform: "uppercase",
    color: G.mid, marginBottom: 8, marginTop: mt, display: "flex", alignItems: "center", gap: 8
  }}>
    <span style={{ flex: 1 }}>{children}</span>
    <span style={{ display: "block", height: 1, flex: 1, background: G.border }} />
  </div>
);

const FFld = ({ label, children, style }) => (
  <div style={style}>
    <div style={{
      fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase",
      color: G.mid, marginBottom: 4
    }}>{label}</div>
    {children}
  </div>
);

const BackBtn = ({ onClick }) => (
  <button onClick={onClick} style={{
    background: "rgba(255,255,255,0.15)", border: "none",
    borderRadius: 8, color: "#fff", padding: "7px 14px", fontFamily: "inherit",
    fontSize: 14, fontWeight: 800, cursor: "pointer", flexShrink: 0
  }}>←</button>
);

const Btn = ({ onClick, bg, col, children, full, sm, disabled, type = "button" }) => (
  <button type={type} onClick={onClick} disabled={disabled}
    style={{
      background: disabled ? "#ccc" : bg, color: disabled ? "#888" : col, border: "none",
      borderRadius: 9, padding: sm ? "6px 13px" : "10px 18px",
      fontFamily: "'DM Sans',sans-serif", fontWeight: 800, fontSize: sm ? 12 : 14,
      cursor: disabled ? "not-allowed" : "pointer", width: full ? "100%" : "auto",
      opacity: disabled ? .7 : 1, transition: "opacity .15s"
    }}>
    {children}
  </button>
);

// ─── PIN pad ──────────────────────────────────────────────────
function PinPad({ label, onDone, onCancel, error }) {
  const [val, setVal] = useState("");
  const inputRef = React.useRef(null);
  const add = d => { if (val.length < 4) setVal(v => v + d); };
  const del = () => setVal(v => v.slice(0, -1));
  useEffect(() => { if (val.length === 4) onDone(val); }, [val]);

  // Focus hidden input on mount so keyboard works immediately
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleKey = e => {
    if (e.key >= "0" && e.key <= "9") add(e.key);
    else if (e.key === "Backspace") del();
  };

  return (
    <div style={{ textAlign: "center", padding: "60px 20px 24px" }}
      onClick={() => inputRef.current?.focus()}>
      {/* Hidden input captures physical keyboard on mobile & desktop */}
      <input ref={inputRef} type="tel" inputMode="numeric" pattern="[0-9]*"
        value={val} readOnly
        onKeyDown={handleKey}
        style={{ position: "absolute", opacity: 0, width: 1, height: 1, pointerEvents: "none" }} />
      <div style={{ fontSize: 15, fontWeight: 800, color: G.text, marginBottom: 24 }}>{label}</div>
      {/* dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 32 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            width: 18, height: 18, borderRadius: "50%",
            background: val.length > i ? G.green : G.border,
            border: `2px solid ${val.length > i ? G.green : G.muted}`,
            transition: "background .15s"
          }} />
        ))}
      </div>
      {error && <div style={{ color: G.red, fontSize: 13, fontWeight: 700, marginBottom: 12 }}>{error}</div>}
      {/* keypad */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, maxWidth: 220, margin: "0 auto" }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((k, i) => (
          <button key={i} type="button"
            onClick={() => { k === "⌫" ? del() : k !== "" ? add(String(k)) : null; inputRef.current?.focus(); }}
            style={{
              background: k === "" ? "transparent" : G.white,
              border: k === "" ? "none" : `1.5px solid ${G.border}`,
              borderRadius: 12, padding: "16px 8px", fontSize: 20, fontWeight: 700,
              cursor: k === "" ? "default" : "pointer", color: G.text, fontFamily: "inherit",
              boxShadow: k === "" ? "none" : "0 1px 4px rgba(0,0,0,.07)"
            }}>
            {k}
          </button>
        ))}
      </div>
      {onCancel && (
        <button type="button" onClick={onCancel} style={{
          marginTop: 20, background: "transparent",
          border: "none", color: G.muted, fontSize: 14, fontWeight: 700, cursor: "pointer",
          fontFamily: "inherit"
        }}>Cancel</button>
      )}
    </div>
  );
}

// ─── Availability gauge (arc dial) ───────────────────────────
function AvailGauge({ gauge, active }) {
  const r = 7, cx = 10, cy = 10, circ = 2 * Math.PI * r;
  const arcLen = circ * 0.75, filled = arcLen * (gauge.pct / 100);
  return (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={active ? "rgba(255,255,255,.15)" : "#e5e7eb"} strokeWidth="3"
        strokeDasharray={`${arcLen} ${circ - arcLen}`}
        strokeDashoffset={circ * 0.125} strokeLinecap="round"
        transform={`rotate(135 ${cx} ${cy})`} />
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={active ? (gauge.pct === 0 ? "rgba(163,230,53,.8)" : gauge.color) : gauge.color}
        strokeWidth="3"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeDashoffset={circ * 0.125} strokeLinecap="round"
        transform={`rotate(135 ${cx} ${cy})`} />
    </svg>
  );
}

// ─── Group-of-people icon (3 silhouettes) ─────────────────────
function GroupIcon({ color, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 20" fill={color}>
      <circle cx="7" cy="5" r="3.2" />
      <path d="M7 10c-3.5 0-5.5 1.6-5.5 3v2h11v-2c0-1.4-2-3-5.5-3z" />
      <circle cx="25" cy="5" r="3.2" />
      <path d="M25 10c-3.5 0-5.5 1.6-5.5 3v2h11v-2c0-1.4-2-3-5.5-3z" />
      <circle cx="16" cy="4" r="3.8" />
      <path d="M16 9.5c-4 0-6.5 1.8-6.5 3.2v2.3h13v-2.3c0-1.4-2.5-3.2-6.5-3.2z" />
    </svg>
  );
}

// ─── Nets Timeline Strip ──────────────────────────────────────
function NetsTimeline({ sessions, netsDate, setNetsDate, setView, setBDate, setBFrom, setBTo, setBNet }) {
  // Build 14-day window starting today
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() + i);
    return localDateStr(d);
  });
  const fmtD = ds => {
    const d = new Date(ds + "T12:00:00");
    return { day: d.toLocaleDateString("en-GB", { weekday: "short" }), date: d.getDate() };
  };

  const daySessions = sessions.filter(s => s.date === netsDate);

  function handleBarClick(e, net, barEl) {
    if (!barEl) return;
    const rect = barEl.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const raw = NET_DAY_START + ratio * NET_SPAN;
    const snapped = Math.round(raw / 15) * 15;
    // Is click on a booked block?
    const isBooked = daySessions.some(s => {
      if (s.net !== net && s.net !== "both") return false;
      return snapped >= toMinsNet(s.from) && snapped < toMinsNet(s.to);
    });
    if (isBooked) return;
    const fromMins = Math.min(snapped, NET_DAY_END - 60);
    const prime = isPrimeTime(`${String(Math.floor(fromMins / 60)).padStart(2, "0")}:${String(fromMins % 60).padStart(2, "0")}`, netsDate);
    const durMins = prime ? 60 : 90;
    const toMins2 = Math.min(fromMins + durMins, NET_DAY_END);
    const fmt = m => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    setBDate(netsDate);
    setBFrom(fmt(fromMins));
    setBTo(fmt(toMins2));
    setBNet(net);
    setView("add");
  }

  const barRefs = {};

  return (
    <div style={{
      background: G.white,
      borderRadius: 14,
      padding: "12px 13px",
      border: `1.5px solid ${G.green}`,
      marginBottom: 12,
      boxShadow: `0 4px 0 0 ${G.green}44, 0 6px 16px rgba(20,83,45,.12)`,
      position: "relative",
    }}>
      {/* "Nets" label accent */}
      <div style={{
        position: "absolute", top: -1, left: 13,
        background: G.green, borderRadius: "0 0 7px 7px",
        padding: "1px 10px", fontSize: 9, fontWeight: 900,
        color: G.lime, letterSpacing: 1.2, textTransform: "uppercase"
      }}>
        Nets Availability
      </div>

      {/* Date strip */}
      <div style={{ display: "flex", gap: 5, marginBottom: 10, overflowX: "auto", paddingBottom: 2, marginTop: 12 }}>
        {dates.map(d => {
          const f = fmtD(d), active = d === netsDate;
          const gauge = netAvailGauge(sessions, d);
          const dow = new Date(d + "T12:00:00").getDay(); // 0=Sun,6=Sat
          const isWeekend = dow === 0 || dow === 6;
          return (
            <button key={d} onClick={() => setNetsDate(d)}
              style={{
                flexShrink: 0,
                background: active ? G.green : isWeekend ? "#e8f5e9" : "#f9fafb",
                border: active ? `2px solid ${G.green}` : isWeekend ? `1.5px solid #c8e6c9` : `1.5px solid ${G.border}`,
                borderRadius: 10, padding: "6px 8px 5px", cursor: "pointer", fontFamily: "inherit",
                minWidth: 44, textAlign: "center", transition: "all .15s",
                boxShadow: active
                  ? "0 3px 0 rgba(20,83,45,.4), inset 0 1px 0 rgba(255,255,255,.2)"
                  : "none",
                transform: active ? "translateY(-1px)" : "none"
              }}>
              <div style={{
                fontSize: 8, fontWeight: 700,
                color: active ? G.lime : isWeekend ? G.green : G.muted,
                textTransform: "uppercase"
              }}>{f.day}</div>
              <div style={{
                fontSize: 14, fontWeight: 900, color: active ? G.lime : G.text,
                margin: "1px 0"
              }}>{f.date}</div>
              <div style={{ display: "flex", justifyContent: "center", marginTop: 1 }}>
                <AvailGauge gauge={gauge} active={active} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Gauge legend */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        {[["#22c55e", "Free"], ["#84cc16", "Some Slots Booked"], ["#f59e0b", "Busy"], ["#ef4444", "Fully Booked"]].map(([c, l]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: c, flexShrink: 0 }} />
            <span style={{ fontSize: 9, color: G.muted, fontWeight: 600, whiteSpace: "nowrap" }}>{l}</span>
          </div>
        ))}
      </div>

      {/* Hour labels */}
      <div style={{ display: "flex", marginBottom: 3 }}>
        <div style={{ width: 54, flexShrink: 0 }} />
        <div style={{ flex: 1, position: "relative", height: 13 }}>
          {[8, 10, 12, 14, 16, 18, 20].map(h => (
            <span key={h} style={{
              position: "absolute",
              left: `${netPct(h * 60)}%`, transform: "translateX(-50%)",
              fontSize: 9, color: G.muted, fontWeight: 600
            }}>{h}:00</span>
          ))}
        </div>
      </div>

      {/* Net bars */}
      {["1", "2"].map(net => {
        const nc = NET_COLORS[net];
        const netSess = daySessions.filter(s => s.net === net || s.net === "both")
          .sort((a, b) => toMinsNet(a.from) - toMinsNet(b.from));
        const isFree = netSess.length === 0;
        const freeSlots = []; let cur = NET_DAY_START;
        netSess.forEach(s => {
          const sf = toMinsNet(s.from), st = toMinsNet(s.to);
          if (sf > cur) freeSlots.push({ from: cur, to: sf });
          cur = Math.max(cur, st);
        });
        if (cur < NET_DAY_END) freeSlots.push({ from: cur, to: NET_DAY_END });
        return (
          <div key={net} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
            <div style={{ width: 54, flexShrink: 0, textAlign: "right" }}>
              <span style={{
                background: nc.bar, color: nc.label, borderRadius: 6,
                padding: "3px 7px", fontSize: 10, fontWeight: 900,
                boxShadow: "0 2px 0 rgba(0,0,0,.12)"
              }}>Net {net}</span>
            </div>
            <div ref={el => { barRefs[net] = el; }}
              onClick={e => handleBarClick(e, net, barRefs[net])}
              style={{
                flex: 1, height: 38, background: nc.barBg, borderRadius: 8,
                position: "relative",
                border: `1.5px solid ${isFree ? nc.borderFree : G.border}`,
                boxShadow: "inset 0 2px 4px rgba(0,0,0,.06)",
                overflow: "hidden", cursor: "crosshair"
              }}>
              {/* Prime shading */}
              {(new Date(netsDate + "T12:00:00").getDay() === 0 || new Date(netsDate + "T12:00:00").getDay() === 6
                ? [{ from: "09:00", to: "13:00" }] : [{ from: "17:00", to: "20:00" }]
              ).map((z, i) => (
                <div key={i} style={{
                  position: "absolute",
                  left: `${netPct(toMinsNet(z.from))}%`,
                  width: `${netPct(toMinsNet(z.to)) - netPct(toMinsNet(z.from))}%`,
                  top: 0, bottom: 0, background: "rgba(250,204,21,.08)",
                  borderLeft: "1px dashed rgba(250,204,21,.4)",
                  borderRight: "1px dashed rgba(250,204,21,.4)",
                  pointerEvents: "none"
                }} />
              ))}
              {/* Grid lines */}
              {[10, 12, 14, 16, 18, 20].map(h => (
                <div key={h} style={{
                  position: "absolute", left: `${netPct(h * 60)}%`,
                  top: 0, bottom: 0, width: 1, background: "rgba(0,0,0,.05)", pointerEvents: "none"
                }} />
              ))}
              {/* Free labels */}
              {freeSlots.filter(f => f.to - f.from >= 90).map((f, i) => (
                <div key={i} style={{
                  position: "absolute", left: `${netPct(f.from)}%`,
                  width: `${netPct(f.to) - netPct(f.from)}%`, top: 0, bottom: 0,
                  display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none"
                }}>
                  <span style={{ fontSize: 8, color: nc.freeText, fontWeight: 700 }}>FREE · tap to book</span>
                </div>
              ))}
              {/* Booked blocks */}
              {netSess.map(s => {
                const tm = getTeamMeta(s.restrictedTo || "Unassigned");
                const w = netPct(toMinsNet(s.to)) - netPct(toMinsNet(s.from));
                return (
                  <div key={s.id} style={{
                    position: "absolute",
                    left: `${netPct(toMinsNet(s.from))}%`, width: `${w}%`,
                    top: 3, bottom: 3, background: tm.bg, borderRadius: 5,
                    padding: "0 5px", overflow: "hidden", cursor: "default",
                    display: "flex", alignItems: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,.15)"
                  }}>
                    <span style={{
                      color: tm.accent || tm.text, fontSize: 9, fontWeight: 800,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                    }}>
                      {s.label || "Session"}{s.net === "both" ? " ×2" : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Weather bar (schedule mini strip) ───────────────────────
function WeatherBar({ wx, setView }) {
  if (!wx) return (
    <div style={{
      background: `linear-gradient(135deg,#14532d,#1a6338)`,
      border: "none", borderRadius: 14, padding: "11px 14px", marginBottom: 12,
      display: "flex", alignItems: "center", gap: 10, opacity: 0.7
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: "50%",
        border: "2px solid rgba(163,230,53,.4)", borderTopColor: G.lime,
        animation: "spin 1s linear infinite", flexShrink: 0
      }} />
      <span style={{ fontSize: 11, color: "rgba(255,255,255,.7)" }}>Fetching Karlebo ground forecast…</span>
    </div>
  );
  if (wx.error) return (
    <div style={{
      background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 14,
      padding: "11px 14px", marginBottom: 12
    }}>
      <span style={{ fontSize: 11, color: "#991b1b" }}>⚠️ Weather unavailable — check connection</span>
    </div>
  );
  const today = wx.daily?.[0];
  // Prefer live /current data; fall back to nearest hourly hour
  const cur = wx.current || (() => {
    const nowHour = `${String(new Date().getHours()).padStart(2, "0")}:00`;
    const idx = (wx.hourly?.time || []).findIndex(t => t.startsWith(wx.today) && t.slice(11, 16) === nowHour);
    if (idx < 0) return null;
    return {
      temp: Math.round(wx.hourly.temperature_2m[idx]),
      feels: Math.round(wx.hourly.apparent_temperature[idx]),
      code: wx.hourly.weathercode[idx],
      wind: Math.round(wx.hourly.windspeed_10m[idx] * 10) / 10,
    };
  })();
  const w = wmo(cur?.code ?? today?.code);
  const rainPeriods = calcRainPeriods(wx.hourly, wx.today);
  const rainStr = rainPeriods.length > 0
    ? `Rain ${rainPeriods[0].from}–${rainPeriods[0].to}`
    : "No rain";
  const windStr = cur?.wind != null ? `${cur.wind} m/s` : (today?.windMax != null ? `${today.windMax} m/s` : "");
  const isRainy = rainPeriods.length > 0;
  return (
    <button onClick={() => setView("weather")}
      style={{
        width: "100%",
        background: `linear-gradient(135deg, #14532d 0%, #1a5c35 60%, #1e3a8a 100%)`,
        border: "none", borderRadius: 14, padding: "0", marginBottom: 12,
        cursor: "pointer", fontFamily: "inherit", textAlign: "left",
        boxSizing: "border-box", overflow: "hidden",
        boxShadow: "0 3px 12px rgba(20,83,45,.25)"
      }}>
      <div style={{ display: "flex", alignItems: "stretch" }}>
        {/* Left: weather info */}
        <div style={{ flex: 1, padding: "9px 12px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24, flexShrink: 0, lineHeight: 1 }}>{w.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 900, color: "#fff" }}>
                {cur?.temp != null ? `${cur.temp}°C` : today?.max != null ? `${today.max}°C` : "--°C"}
              </span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,.75)", fontWeight: 600 }}>
                · {w.label}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, color: isRainy ? "#93c5fd" : G.lime, fontWeight: 700 }}>
                {isRainy ? "🌧️ " : ""}{rainStr}
              </span>
              {windStr && <span style={{ fontSize: 10, color: "rgba(255,255,255,.55)" }}>· 💨 {windStr}</span>}
              <span style={{ fontSize: 10, color: "rgba(255,255,255,.4)" }}>· Karlebo</span>
            </div>
          </div>
        </div>
        {/* Right: CTA panel */}
        <div style={{
          background: "rgba(255,255,255,.1)", borderLeft: "1px solid rgba(255,255,255,.12)",
          padding: "9px 13px", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 3, flexShrink: 0, minWidth: 90
        }}>
          <span style={{
            fontSize: 9, fontWeight: 800, color: G.lime,
            textTransform: "uppercase", letterSpacing: .8, textAlign: "center",
            lineHeight: 1.3
          }}>
            Detailed<br />Forecast
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 13 }}>📡</span>
            <span style={{ fontSize: 15, color: G.lime, fontWeight: 900, lineHeight: 1 }}>›</span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Full weather page ────────────────────────────────────────
function WeatherPage({ wx, setView }) {
  const [tab, setTab] = React.useState("today");

  if (!wx || wx.error) return (
    <div style={{ padding: "40px 20px", textAlign: "center", color: G.muted }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🌡️</div>
      <div style={{ fontWeight: 800, color: G.text, marginBottom: 6 }}>
        {!wx ? "Loading forecast…" : "Forecast unavailable"}
      </div>
      <div style={{ fontSize: 13 }}>Please check your connection and try again.</div>
      <button onClick={() => setView("schedule")} style={{
        marginTop: 20, background: G.green,
        color: G.lime, border: "none", borderRadius: 10, padding: "10px 22px",
        fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit"
      }}>
        ← Back
      </button>
    </div>
  );

  const { hourly, daily: dailyArr, today } = wx;
  const todayDaily = dailyArr?.[0];

  // Filter hourly for today
  // Filter hourly for today (7:00–21:00)
  const todayHrs = (hourly?.time || []).reduce((acc, t, i) => {
    if (t.startsWith(wx.today)) acc.push({
      time: t.slice(11, 16),
      temp: Math.round(hourly.temperature_2m[i]),
      feels: Math.round(hourly.apparent_temperature[i]),
      precip: +(hourly.precipitation[i] || 0).toFixed(1),
      prob: hourly.precipitation_probability[i] || 0,
      code: hourly.weathercode[i],
      wind: +(hourly.windspeed_10m[i] || 0).toFixed(1),
      vis: hourly.visibility?.[i],
      isDay: hourly.is_day?.[i],
    });
    return acc;
  }, []).filter(h => parseInt(h.time) >= 7 && parseInt(h.time) <= 21);

  const rainPeriods = calcRainPeriods(hourly, wx.today);
  const sunrise = todayDaily?.sunrise?.slice(11, 16);
  const sunset = todayDaily?.sunset?.slice(11, 16);

  return (
    <div style={{ padding: "0 0 100px" }}>
      {/* Hero card */}
      <div style={{
        background: `linear-gradient(135deg, ${G.green} 0%, #1a4731 100%)`,
        padding: "20px 18px 18px"
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{
              color: "rgba(255,255,255,.55)", fontSize: 11, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: 1, marginBottom: 4
            }}>
              📍 Karlebo Cricket Ground
            </div>
            <div style={{ color: G.lime, fontWeight: 900, fontSize: 13, marginBottom: 2 }}>
              {new Date(wx.today + "T12:00:00").toLocaleDateString("en-GB",
                { weekday: "long", day: "numeric", month: "long" })}
            </div>
            <div style={{
              fontSize: 46, fontWeight: 900, color: "#fff", lineHeight: 1,
              marginBottom: 4
            }}>
              {wx.current?.temp != null ? `${wx.current.temp}°` : todayDaily?.max != null ? `${todayDaily.max}°` : "--°"}
              <span style={{
                fontSize: 18, fontWeight: 400, color: "rgba(255,255,255,.6)",
                marginLeft: 4
              }}>C now</span>
            </div>
            <div style={{
              color: "rgba(255,255,255,.75)", fontSize: 14, fontWeight: 600,
              marginBottom: 2
            }}>
              {wmo(wx.current?.code ?? todayDaily?.code ?? 0).label}
            </div>
            <div style={{ color: "rgba(255,255,255,.5)", fontSize: 12 }}>
              Feels like {wx.current?.feels ?? todayHrs[0]?.feels ?? todayDaily?.min}°C
              · Low {todayDaily?.min}° High {todayDaily?.max}°
            </div>
          </div>
          <div style={{ fontSize: 64, lineHeight: 1 }}>{wmo(todayDaily?.code || 0).emoji}</div>
        </div>

        {/* Sunrise / sunset row */}
        {sunrise && sunset && (
          <div style={{
            display: "flex", gap: 16, marginTop: 14,
            background: "rgba(255,255,255,.08)", borderRadius: 10, padding: "9px 14px"
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontSize: 10, color: "rgba(255,255,255,.5)", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: .8
              }}>Sunrise</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: G.lime }}>🌅 {sunrise}</div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,.15)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontSize: 10, color: "rgba(255,255,255,.5)", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: .8
              }}>Sunset</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: G.lime }}>🌇 {sunset}</div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,.15)" }} />
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{
                fontSize: 10, color: "rgba(255,255,255,.5)", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: .8
              }}>Daylight</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: G.lime }}>
                {(() => {
                  if (!sunrise || !sunset) return "--";
                  const [sh, sm] = sunrise.split(":").map(Number);
                  const [eh, em] = sunset.split(":").map(Number);
                  const mins = (eh * 60 + em) - (sh * 60 + sm);
                  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Wind / humidity row */}
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          {[
            ["💨", "Wind", todayDaily?.windMax != null ? `${todayDaily.windMax} m/s` : "--"],
            ["🌧️", "Rain", todayDaily?.rainSum != null ? `${todayDaily.rainSum}mm` : "0mm"],
            ["🎲", "Rain%", todayDaily?.rainProb != null ? `${todayDaily.rainProb}%` : "--"],
          ].map(([ico, lbl, val]) => (
            <div key={lbl} style={{
              flex: 1, background: "rgba(255,255,255,.08)",
              borderRadius: 9, padding: "8px 6px", textAlign: "center"
            }}>
              <div style={{ fontSize: 14 }}>{ico}</div>
              <div style={{
                fontSize: 9, color: "rgba(255,255,255,.45)", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: .7, marginBottom: 1
              }}>{lbl}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "14px 14px 0" }}>
        {/* Tabs */}
        <div style={{
          display: "flex", gap: 6, marginBottom: 14,
          background: G.cream, borderRadius: 10, padding: 4
        }}>
          {[["today", "Today"], ["week", "7-Day"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{
                flex: 1, background: tab === k ? G.green : "transparent",
                color: tab === k ? G.lime : G.muted, border: "none",
                borderRadius: 7, padding: "7px", fontSize: 12, fontWeight: 800,
                cursor: "pointer", fontFamily: "inherit", transition: "all .12s"
              }}>
              {l}
            </button>
          ))}
        </div>

        {tab === "today" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            {/* Rain periods highlight */}
            {rainPeriods.length > 0 ? (
              <div style={{
                background: "#eff6ff", border: "1.5px solid #bfdbfe",
                borderRadius: 12, padding: "12px 14px"
              }}>
                <div style={{ fontWeight: 800, fontSize: 12, color: "#1e3a8a", marginBottom: 6 }}>
                  🌧️ Rain expected today
                </div>
                {rainPeriods.map((p, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", padding: "5px 0",
                    borderTop: i > 0 ? "1px solid #dbeafe" : "none"
                  }}>
                    <span style={{ fontSize: 12, color: "#1e40af", fontWeight: 700 }}>
                      {p.from} – {p.to}
                    </span>
                    <span style={{
                      background: "#1e3a8a", color: "#bfdbfe", borderRadius: 20,
                      padding: "2px 10px", fontSize: 11, fontWeight: 800
                    }}>
                      {p.mm} mm
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                background: "#f0fdf4", border: "1.5px solid #bbf7d0",
                borderRadius: 12, padding: "12px 14px", display: "flex", gap: 10,
                alignItems: "center"
              }}>
                <span style={{ fontSize: 20 }}>✅</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#166534" }}>
                  No rain expected today — great day for cricket!
                </span>
              </div>
            )}

            {/* Hourly strip */}
            <div style={{
              background: G.white, border: `1.5px solid ${G.border}`,
              borderRadius: 12, padding: "12px 14px"
            }}>
              <div style={{
                fontSize: 11, fontWeight: 900, color: G.muted,
                textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10
              }}>
                Hourly — Today
              </div>
              <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
                {todayHrs.map(h => {
                  const w2 = wmo(h.code);
                  const isRainy = h.precip > 0.05;
                  return (
                    <div key={h.time} style={{
                      flexShrink: 0, textAlign: "center",
                      background: isRainy ? "#eff6ff" : h.isDay ? "#f9fafb" : "#1a2e1a",
                      borderRadius: 9, padding: "8px 6px", minWidth: 46,
                      border: isRainy ? "1.5px solid #bfdbfe" : `1px solid ${G.border}`
                    }}>
                      <div style={{
                        fontSize: 9, fontWeight: 700,
                        color: h.isDay ? G.muted : "rgba(255,255,255,.5)",
                        marginBottom: 2
                      }}>{h.time}</div>
                      <div style={{ fontSize: 16, marginBottom: 2 }}>{w2.emoji}</div>
                      <div style={{
                        fontSize: 12, fontWeight: 900,
                        color: h.isDay ? G.text : "#fff"
                      }}>{h.temp}°</div>
                      {isRainy && <div style={{
                        fontSize: 9, color: "#1e40af",
                        fontWeight: 700, marginTop: 1
                      }}>{h.precip}mm</div>}
                      <div style={{
                        fontSize: 9, color: h.isDay ? G.muted : "rgba(255,255,255,.4)",
                        marginTop: 2
                      }}>{h.wind}m/s</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Visibility / wind detail */}
            {todayHrs.length > 0 && (
              <div style={{
                background: G.white, border: `1.5px solid ${G.border}`,
                borderRadius: 12, padding: "12px 14px"
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 900, color: G.muted,
                  textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8
                }}>
                  Conditions at training time (17:00–20:00)
                </div>
                {todayHrs.filter(h => parseInt(h.time) >= 17 && parseInt(h.time) <= 20).map(h => (
                  <div key={h.time} style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", padding: "5px 0",
                    borderBottom: `1px solid ${G.border}`
                  }}>
                    <span style={{ fontWeight: 700, fontSize: 12, color: G.text }}>{h.time}</span>
                    <span style={{ fontSize: 12 }}>{wmo(h.code).emoji} {wmo(h.code).label}</span>
                    <span style={{ fontSize: 12, color: G.muted }}>{h.temp}° · {h.wind}m/s</span>
                    {h.vis && <span style={{ fontSize: 11, color: G.muted }}>
                      {h.vis >= 10000 ? "Excellent" : h.vis >= 5000 ? "Good" : h.vis >= 2000 ? "Moderate" : "Poor"} vis.
                    </span>}
                  </div>
                ))}
                {todayHrs.filter(h => parseInt(h.time) >= 17 && parseInt(h.time) <= 20).length === 0 && (
                  <div style={{ fontSize: 12, color: G.muted }}>Outside forecast window</div>
                )}
              </div>
            )}

            {/* Source note */}
            <div style={{ textAlign: "center", padding: "4px 0" }}>
              <span style={{ fontSize: 10, color: G.muted }}>
                📡 Data: Open-Meteo (ECMWF model) · Same source as YR.no &amp; DMI
              </span>
            </div>
          </div>
        )}

        {tab === "week" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(dailyArr || []).map((d, i) => {
              const dw = wmo(d.code || 0);
              const dayStr = new Date(d.date + "T12:00:00").toLocaleDateString("en-GB",
                { weekday: "short", day: "numeric", month: "short" });
              return (
                <div key={d.date} style={{
                  background: G.white,
                  border: `1.5px solid ${G.border}`, borderRadius: 12,
                  padding: "12px 14px", display: "flex", alignItems: "center", gap: 12
                }}>
                  <div style={{ width: 44, flexShrink: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: G.muted }}>{dayStr.split(" ")[0]}</div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: G.text }}>
                      {dayStr.split(" ").slice(1).join(" ")}
                    </div>
                  </div>
                  <div style={{ fontSize: 26, flexShrink: 0 }}>{dw.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 700, color: G.text,
                      marginBottom: 2
                    }}>{dw.label}</div>
                    <div style={{ fontSize: 11, color: G.muted }}>
                      {d.rainSum > 0 ? `🌧️ ${d.rainSum}mm` : "No rain"}
                      {d.rainProb > 0 ? ` · ${d.rainProb}% chance` : ""}
                      · 💨 {d.windMax}m/s
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: G.text }}>{d.max}°</div>
                    <div style={{ fontSize: 11, color: G.muted }}>{d.min}°</div>
                  </div>
                </div>
              );
            })}
            <div style={{ textAlign: "center", padding: "4px 0" }}>
              <span style={{ fontSize: 10, color: G.muted }}>
                📡 Data: Open-Meteo (ECMWF model) · Same source as YR.no &amp; DMI
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Cricket net SVG icons ────────────────────────────────────
function NetIcon({ color = "currentColor", size = 18 }) {
  // Single cricket net: post + netting rectangle
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      {/* Post */}
      <line x1="4" y1="3" x2="4" y2="20" />
      {/* Top rail */}
      <line x1="4" y1="4" x2="20" y2="4" />
      {/* Net frame */}
      <rect x="4" y="4" width="16" height="12" rx="0.5" strokeWidth="1.8" />
      {/* Net grid — vertical */}
      <line x1="9" y1="4" x2="9" y2="16" strokeWidth="0.9" strokeDasharray="0" />
      <line x1="14" y1="4" x2="14" y2="16" strokeWidth="0.9" />
      <line x1="19" y1="4" x2="19" y2="16" strokeWidth="0.9" />
      {/* Net grid — horizontal */}
      <line x1="4" y1="8" x2="20" y2="8" strokeWidth="0.9" />
      <line x1="4" y1="12" x2="20" y2="12" strokeWidth="0.9" />
      {/* Ground line */}
      <line x1="2" y1="20" x2="22" y2="20" strokeWidth="1.4" />
    </svg>
  );
}

function BothNetsIcon({ color = "currentColor", size = 18 }) {
  // Two nets side by side
  return (
    <svg width={size * 1.5} height={size} viewBox="0 0 36 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      {/* Net 1 */}
      <line x1="2" y1="3" x2="2" y2="20" />
      <rect x="2" y="4" width="13" height="11" rx="0.5" strokeWidth="1.6" />
      <line x1="6" y1="4" x2="6" y2="15" strokeWidth="0.8" />
      <line x1="10" y1="4" x2="10" y2="15" strokeWidth="0.8" />
      <line x1="14" y1="4" x2="14" y2="15" strokeWidth="0.8" />
      <line x1="2" y1="8" x2="15" y2="8" strokeWidth="0.8" />
      <line x1="2" y1="12" x2="15" y2="12" strokeWidth="0.8" />
      {/* Net 2 */}
      <line x1="21" y1="3" x2="21" y2="20" />
      <rect x="21" y="4" width="13" height="11" rx="0.5" strokeWidth="1.6" />
      <line x1="25" y1="4" x2="25" y2="15" strokeWidth="0.8" />
      <line x1="29" y1="4" x2="29" y2="15" strokeWidth="0.8" />
      <line x1="33" y1="4" x2="33" y2="15" strokeWidth="0.8" />
      <line x1="21" y1="8" x2="34" y2="8" strokeWidth="0.8" />
      <line x1="21" y1="12" x2="34" y2="12" strokeWidth="0.8" />
      {/* Ground */}
      <line x1="1" y1="20" x2="35" y2="20" strokeWidth="1.4" />
    </svg>
  );
}

// ─── PlayerGroup — collapsible team section in session detail ──
function PlayerGroup({ team, players, members, lifts, selSess, isSelf, cutoff, canRemove, onRemove, onCarpoolEdit, onCarpoolSet, single }) {
  const [open, setOpen] = React.useState(true); // default open
  const tm = getTeamMeta(team);
  const dispStop = d => { const o = getLiftObj(d); if (!o.stop) return ""; return o.stop === "Other" ? (o.stopOther || "Other") : o.stop; };
  return (
    <div style={{ marginBottom: 10 }}>
      {/* Group header — hide toggle when only one group */}
      {!single && (
        <button onClick={() => setOpen(v => !v)}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 8,
            padding: "7px 12px", borderRadius: 10, border: "none", cursor: "pointer",
            fontFamily: "inherit", marginBottom: 4,
            background: `${tm.bg}22`,
          }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: tm.bg, flexShrink: 0 }} />
          <span style={{ fontWeight: 800, fontSize: 12, color: tm.bg, flex: 1, textAlign: "left" }}>
            {team}
          </span>
          <span style={{ fontSize: 11, color: G.muted, fontWeight: 600 }}>
            {players.length} player{players.length !== 1 ? "s" : ""}
          </span>
          <span style={{ fontSize: 12, color: G.muted }}>{open ? "▲" : "▼"}</span>
        </button>
      )}
      {(open || single) && players.map((p, i) => {
        const mem = members.find(m => m.name === p);
        const self = isSelf(p);
        const liftObj = getLiftObj((lifts || {})[p]);
        const liftPref = liftObj.pref;
        const isO = liftPref === "offer", isN = liftPref === "need";
        return (
          <div key={p} style={{
            background: G.white,
            border: `1.5px solid ${isO ? "#86efac" : isN ? "#93c5fd" : G.border}`,
            borderRadius: 10, padding: "10px 14px", marginBottom: 6,
            display: "flex", alignItems: "center", justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1, minWidth: 0 }}>
              <div style={{
                width: 36, height: 36, background: `${G.green}18`, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 900, fontSize: 13, color: G.green, flexShrink: 0, marginTop: 1
              }}>
                {p.split(" ").map(w => w[0]).join("").slice(0, 2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, color: G.text, fontSize: 15 }}>
                  {p}{self && <span style={{ color: G.muted, fontSize: 12, fontWeight: 500, marginLeft: 6 }}>(you)</span>}
                  {mem?.isCoach && <span style={{ fontSize: 12, marginLeft: 5 }} title="Coach">🧢</span>}
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 2, flexWrap: "wrap" }}>
                  {(mem?.teams || []).map(t => <TeamPill key={t} team={t} sm />)}
                  {mem?.role && mem.role !== "member" && <RolePill role={mem.role} />}
                </div>
                {/* Lift inline badge */}
                {liftPref && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5, flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                      background: isO ? "#dcfce7" : isN ? "#dbeafe" : "rgba(0,0,0,.05)",
                      color: isO ? "#166534" : isN ? "#1e3a5f" : G.muted,
                      border: `0.5px solid ${isO ? "#86efac" : isN ? "#93c5fd" : "rgba(0,0,0,.1)"}`
                    }}>
                      {isO ? "🚘 Offering lift" : isN ? "🙋 Needs lift" : "🚀 Own transport"}
                    </span>
                    {isO && liftObj.seats > 0 && <span style={{ fontSize: 11, color: G.muted }}>💺 {liftObj.seats} seat{liftObj.seats > 1 ? "s" : ""}</span>}
                    {dispStop(liftObj) && <span style={{ fontSize: 11, color: G.muted }}>📍 {dispStop(liftObj)}</span>}
                    {liftObj.note && <span style={{ fontSize: 11, color: G.muted, fontStyle: "italic" }}>"{liftObj.note}"</span>}
                    {self && !cutoff && (
                      <button onClick={() => onCarpoolEdit(p)}
                        style={{
                          fontSize: 11, background: "none", border: "none", color: G.muted,
                          textDecoration: "underline", cursor: "pointer", fontFamily: "inherit", padding: 0
                        }}>
                        Edit
                      </button>
                    )}
                  </div>
                )}
                {!liftPref && self && !cutoff && (
                  <button onClick={onCarpoolSet}
                    style={{
                      marginTop: 5, fontSize: 11, fontWeight: 700, padding: "3px 10px",
                      borderRadius: 20, border: `1px solid ${G.border}`, background: G.cream,
                      color: G.muted, cursor: "pointer", fontFamily: "inherit"
                    }}>
                    🚘 Set car pool preference
                  </button>
                )}
              </div>
            </div>
            {canRemove ? (
              <Btn onClick={() => onRemove(p)} bg={G.redBg} col={G.red} sm>Remove</Btn>
            ) : self ? (
              cutoff
                ? <span style={{ fontSize: 11, color: G.muted, fontWeight: 700 }}>🔒 Locked</span>
                : <Btn onClick={() => onRemove(p)} bg={G.redBg} col={G.red} sm>Leave</Btn>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// ─── Session card ─────────────────────────────────────────────
// ─── Carpool Bottom Sheet ─────────────────────────────────────
function CarpoolSheet({ sess, sessions, myName, liftDraft, setLiftDraft, liftEditing, setLiftEditing, saveSessions, selSess, setSelSess, onClose }) {
  const lifts = sess.lifts || {};
  const myRaw = lifts[myName];
  const myData = getLiftObj(myRaw);
  const draft = liftDraft || myData;
  const isO = draft.pref === "offer", isN = draft.pref === "need", isSelf = draft.pref === "self";

  const dispStop = d => {
    const o = getLiftObj(d);
    if (!o.stop) return "";
    return o.stop === "Other" ? (o.stopOther || "Other") : o.stop;
  };

  const offering = sess.players.filter(p => getLiftPref(lifts[p]) === "offer");
  const needing = sess.players.filter(p => getLiftPref(lifts[p]) === "need");
  const ownT = sess.players.filter(p => getLiftPref(lifts[p]) === "self");

  function saveLift(obj) {
    const newLifts = { ...(sess.lifts || {}) };
    if (obj && obj.pref) newLifts[myName] = obj; else delete newLifts[myName];
    const updatedSess = { ...sess, lifts: newLifts };
    const updated = sessions.map(s => s.id === sess.id ? updatedSess : s);
    saveSessions(updated);
    if (selSess?.id === sess.id) setSelSess(updatedSess);
    // Update sheet's own sess so it re-renders showing saved state
    // We do this by closing and the parent sees updated selSess/sessions
    setLiftDraft(null);
    setLiftEditing(false);
    onClose(); // close sheet — saved state now visible in session detail carpool section
  }

  const PILL = (label, active, col, bg, bord, onClick) => (
    <button onClick={onClick} style={{
      fontSize: 12, fontWeight: 700, padding: "7px 0", flex: 1,
      borderRadius: 20, border: `1.5px solid ${active ? bord : "rgba(0,0,0,.1)"}`,
      background: active ? bg : G.white, color: active ? col : G.muted,
      cursor: "pointer", fontFamily: "inherit", transition: "all .13s"
    }}>
      {label}
    </button>
  );

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
        zIndex: 300, animation: "fadeIn .2s ease"
      }} />
      {/* Sheet */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 500, zIndex: 301, background: G.white,
        borderRadius: "20px 20px 0 0", boxShadow: "0 -8px 40px rgba(0,0,0,.18)",
        animation: "slideUp .25s ease", maxHeight: "85vh", overflowY: "auto",
        boxSizing: "border-box", paddingBottom: "max(20px,env(safe-area-inset-bottom))"
      }}>

        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 20, background: G.border }} />
        </div>

        {/* Header */}
        <div style={{
          padding: "4px 16px 10px", borderBottom: `1px solid ${G.border}`,
          display: "flex", alignItems: "flex-start", justifyContent: "space-between"
        }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 15, color: G.green }}>🚘 Car Pool Info</div>
            <div style={{ fontSize: 12, color: G.muted, marginTop: 1 }}>
              {fmtShort(sess.date)} · {sess.from}–{sess.to}{sess.label ? " · " + sess.label : ""}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", fontSize: 20,
            color: G.muted, cursor: "pointer", padding: "0 0 0 8px", lineHeight: 1
          }}>×</button>
        </div>

        <div style={{ padding: "12px 16px" }}>

          {/* Other players */}
          {(offering.length > 0 || needing.length > 0 || ownT.length > 0) ? (
            <div style={{ marginBottom: 14 }}>
              {offering.map(name => {
                const obj = getLiftObj(lifts[name]); const loc = dispStop(lifts[name]);
                return (
                  <div key={name} style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "9px 12px", background: "#f0fdf4", borderRadius: 10, marginBottom: 7,
                    border: "0.5px solid #86efac"
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", background: "#14532d22",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 900, color: G.green, flexShrink: 0
                    }}>
                      {name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                        <span style={{ fontWeight: 800, fontSize: 13, color: G.text }}>{name}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "1px 8px", borderRadius: 20,
                          background: "#dcfce7", color: "#166534", border: "0.5px solid #86efac"
                        }}>
                          🚘 Offering
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: G.muted, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {obj.seats > 0 && <span>💺 {obj.seats} seat{obj.seats > 1 ? "s" : ""}</span>}
                        {loc && <span>📍 {loc}</span>}
                        {obj.note && <span style={{ fontStyle: "italic" }}>"{obj.note}"</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {needing.map(name => {
                const obj = getLiftObj(lifts[name]); const loc = dispStop(lifts[name]);
                return (
                  <div key={name} style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "9px 12px", background: "#eff6ff", borderRadius: 10, marginBottom: 7,
                    border: "0.5px solid #93c5fd"
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", background: "#1e3a5f22",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 900, color: "#1e3a5f", flexShrink: 0
                    }}>
                      {name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                        <span style={{ fontWeight: 800, fontSize: 13, color: G.text }}>{name}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "1px 8px", borderRadius: 20,
                          background: "#dbeafe", color: "#1e3a5f", border: "0.5px solid #93c5fd"
                        }}>
                          🙋 Needs lift
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: G.muted, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {loc && <span>📍 {loc}</span>}
                        {obj.note && <span style={{ fontStyle: "italic" }}>"{obj.note}"</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {ownT.filter(n => n !== myName).map(name => (
                <div key={name} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", background: G.cream, borderRadius: 10, marginBottom: 7,
                  border: `0.5px solid ${G.border}`
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", background: `${G.green}18`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 900, color: G.green, flexShrink: 0
                  }}>
                    {name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                  </div>
                  <span style={{ fontWeight: 800, fontSize: 13, color: G.text, flex: 1 }}>{name}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "1px 8px", borderRadius: 20,
                    background: "rgba(0,0,0,.05)", color: G.muted, border: `0.5px solid ${G.border}`
                  }}>
                    🚀 Own transport
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              fontSize: 12, color: G.muted, fontStyle: "italic", textAlign: "center",
              padding: "10px 0 14px"
            }}>
              No one has set a preference yet — be the first!
            </div>
          )}

          {/* My preference */}
          <div style={{ borderTop: `1px solid ${G.border}`, paddingTop: 12 }}>
            <div style={{
              fontSize: 11, fontWeight: 800, color: G.muted, textTransform: "uppercase",
              letterSpacing: 1.1, marginBottom: 8
            }}>Your preference</div>

            {myData.pref && !liftEditing ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                padding: "9px 12px", background: isO ? "#f0fdf4" : isN ? "#eff6ff" : "rgba(0,0,0,.03)",
                borderRadius: 10, border: `0.5px solid ${isO ? "#86efac" : isN ? "#93c5fd" : G.border}`
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: isO ? "#166534" : isN ? "#1e3a5f" : G.muted }}>
                  {isO ? "🚘 Offering lift" : isN ? "🙋 Needs lift" : "🚀 Own transport"}
                </span>
                {isO && myData.seats > 0 && <span style={{ fontSize: 11, color: G.muted }}>💺 {myData.seats} seat{myData.seats > 1 ? "s" : ""}</span>}
                {dispStop(myData) && <span style={{ fontSize: 11, color: G.muted }}>📍 {dispStop(myData)}</span>}
                {myData.note && <span style={{ fontSize: 11, color: G.muted, fontStyle: "italic" }}>"{myData.note}"</span>}
                <button onClick={() => setLiftEditing(true)}
                  style={{
                    marginLeft: "auto", fontSize: 11, background: "none", border: "none",
                    color: G.muted, textDecoration: "underline", cursor: "pointer",
                    fontFamily: "inherit", padding: 0
                  }}>Edit</button>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", gap: 7, marginBottom: draft.pref ? 10 : 0 }}>
                  {PILL("🚘 Offer lift", isO, "#166534", "#f0fdf4", "#86efac",
                    () => setLiftDraft(d => ({ ...(d || { seats: 1, stop: "", stopOther: "", note: "" }), pref: isO ? "" : "offer" })))}
                  {PILL("🙋 Need lift", isN, "#1e3a5f", "#eff6ff", "#93c5fd",
                    () => setLiftDraft(d => ({ ...(d || { seats: 1, stop: "", stopOther: "", note: "" }), pref: isN ? "" : "need" })))}
                  {PILL("🚀 Own", isSelf, G.muted, "rgba(0,0,0,.05)", "rgba(0,0,0,.15)",
                    () => setLiftDraft(d => ({ ...(d || { seats: 0, stop: "", stopOther: "", note: "" }), pref: isSelf ? "" : "self" })))}
                </div>
                {isSelf && (
                  <button onClick={() => saveLift({ ...draft, saved: true })}
                    style={{
                      width: "100%", marginTop: 8, padding: "10px 0", borderRadius: 10, border: "none",
                      fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer",
                      background: G.muted, color: "#fff"
                    }}>
                    Done ✓
                  </button>
                )}
                {(isO || isN) && (
                  <div style={{
                    background: "#f8fdf9", border: `0.5px solid ${isO ? "#c6f0d0" : "#93c5fd"}`,
                    borderRadius: 10, padding: "11px 12px", marginTop: 4
                  }}>
                    {isO && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{
                          fontSize: 10, fontWeight: 700, color: G.muted,
                          textTransform: "uppercase", letterSpacing: 1, marginBottom: 6
                        }}>Seats available</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          {[1, 2, 3, 4].map(n => {
                            const on = (draft.seats || 1) === n;
                            return <button key={n} onClick={() => setLiftDraft(d => ({ ...d, seats: n }))}
                              style={{
                                width: 34, height: 34, borderRadius: "50%",
                                border: `1.5px solid ${on ? G.green : "rgba(0,0,0,.12)"}`,
                                background: on ? G.green : G.white, color: on ? G.lime : G.text,
                                fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center"
                              }}>
                              {n}
                            </button>;
                          })}
                        </div>
                      </div>
                    )}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{
                        fontSize: 10, fontWeight: 700, color: G.muted,
                        textTransform: "uppercase", letterSpacing: 1, marginBottom: 6
                      }}>
                        {isO ? "Pickup stops" : "Your stop"}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {CARPOOL_STOPS.map(st => {
                          const on = (draft.stop || "") === st;
                          const ac = isO ? "#166534" : "#1e3a5f";
                          const ab = isO ? "#f0fdf4" : "#eff6ff";
                          const abord = isO ? "#86efac" : "#93c5fd";
                          return <button key={st} onClick={() => setLiftDraft(d => ({ ...d, stop: st }))}
                            style={{
                              fontSize: 11, fontWeight: 600, padding: "5px 11px", borderRadius: 20,
                              cursor: "pointer", fontFamily: "inherit",
                              border: `1px solid ${on ? abord : "rgba(0,0,0,.1)"}`,
                              background: on ? ab : G.white, color: on ? ac : G.muted
                            }}>
                            {st}
                          </button>;
                        })}
                      </div>
                      {draft.stop === "Other" && (
                        <input value={draft.stopOther || ""}
                          onChange={e => setLiftDraft(d => ({ ...d, stopOther: e.target.value }))}
                          placeholder="Your location…"
                          style={{
                            marginTop: 7, width: "100%", boxSizing: "border-box",
                            padding: "7px 10px", borderRadius: 8, fontSize: 12,
                            border: "0.5px solid rgba(0,0,0,.15)", fontFamily: "inherit",
                            background: G.white, color: G.text
                          }} />
                      )}
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{
                        fontSize: 10, fontWeight: 700, color: G.muted,
                        textTransform: "uppercase", letterSpacing: 1, marginBottom: 5
                      }}>
                        Note <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span>
                      </div>
                      <textarea rows={2} value={draft.note || ""}
                        onChange={e => setLiftDraft(d => ({ ...d, note: e.target.value }))}
                        placeholder={isO ? "e.g. Leaving 16:00, WhatsApp me" : "e.g. At stop from 16:15"}
                        style={{
                          width: "100%", boxSizing: "border-box", padding: "7px 10px",
                          borderRadius: 8, fontSize: 12, border: "0.5px solid rgba(0,0,0,.15)",
                          fontFamily: "inherit", resize: "none", background: G.white, color: G.text
                        }} />
                    </div>
                    <button onClick={() => saveLift({ ...draft, saved: true })}
                      style={{
                        width: "100%", padding: "10px 0", borderRadius: 10, border: "none",
                        fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer",
                        background: isO ? G.green : "#1e3a5f", color: isO ? G.lime : "#bfdbfe"
                      }}>
                      Done ✓
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function SessCard({ s, members, teams, faded, onClick, onCarpoolClick }) {
  // Coaches: use stored s.coaches, or derive from sessionTeams/restrictedTo
  const sessionCoaches = (s.restrictedTo || s.sessionTeams?.length) ? (
    s.coaches ||
    [...new Set((s.sessionTeams || [s.restrictedTo].filter(Boolean)).flatMap(tn =>
      teams?.find(t => t.name === tn)?.coaches || []
    ))]
  ) : [];
  return (
    <div onClick={onClick} style={{
      background: isToday(s.date) ? "#f7ffe8" : G.white,
      borderRadius: 14, padding: "13px 15px", marginBottom: 9,
      border: isToday(s.date) ? `2px solid ${G.lime}` : `1.5px solid ${G.border}`,
      opacity: faded ? .48 : 1, cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "space-between"
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* ── Date + time header — bordered ── */}
        <div style={{
          background: isToday(s.date) ? `${G.lime}22` : "rgba(0,0,0,.025)",
          border: `1px solid ${isToday(s.date) ? G.lime : G.border}`,
          borderRadius: 9, padding: "6px 10px", marginBottom: 7
        }}>
          {/* Row 1: date + chips */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: G.green, letterSpacing: "-.2px" }}>
              {fmtShort(s.date)}
            </span>
            {isToday(s.date) && <span style={{
              background: G.lime, color: G.green, borderRadius: 20,
              padding: "1px 7px", fontSize: 9, fontWeight: 900
            }}>TODAY</span>}
            {s.restrictedTo && <span style={{
              background: "#fef9c3", color: "#92400e", borderRadius: 20,
              padding: "1px 7px", fontSize: 9, fontWeight: 800
            }}>🔒 {s.restrictedTo}</span>}
            {s.recurringId && !s.restrictedTo && <span style={{
              background: "#f0f9ff", color: "#0369a1",
              borderRadius: 20, padding: "1px 7px", fontSize: 9, fontWeight: 800
            }}>↻</span>}
            {s.net && <span style={{
              background: s.net === "both" ? "#fef3c7" : s.net === "2" ? "#ede9fe" : "#dcfce7",
              color: s.net === "both" ? "#92400e" : s.net === "2" ? "#5b21b6" : "#166534",
              borderRadius: 20, padding: "1px 7px", fontSize: 9, fontWeight: 800,
              display: "inline-flex", alignItems: "center", gap: 3
            }}>
              {s.net === "both"
                ? <><BothNetsIcon color="#92400e" size={10} /> Both Nets</>
                : <><NetIcon color={s.net === "2" ? "#5b21b6" : "#166534"} size={10} /> Net {s.net}</>}
            </span>}
          </div>
          {/* Session name — prominent, own line */}
          {s.label && (
            <div style={{
              fontWeight: 900, fontSize: 14, color: G.text,
              marginTop: 3, letterSpacing: "-.1px", lineHeight: 1.2
            }}>
              {s.label}
            </div>
          )}
          {/* Row 2: time + coach */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
            <span style={{ fontSize: 12, color: G.green, fontWeight: 800 }}>{s.from} – {s.to}</span>
            {/* Coach chips — max 3 visible, +N for rest */}
            {s.restrictedTo && sessionCoaches.length > 0 && <>
              <span style={{
                fontSize: 10, color: G.muted, fontWeight: 700,
                letterSpacing: .3
              }}>Coach:</span>
              {sessionCoaches.slice(0, 3).map(name => (
                <span key={name} style={{
                  fontSize: 10, fontWeight: 700, padding: "1px 7px",
                  borderRadius: 20, background: "#fef9c3", color: "#92400e",
                  border: "0.5px solid #fde68a", display: "inline-flex", alignItems: "center", gap: 2
                }}>
                  🧢 {name.split(" ")[0]}
                </span>
              ))}
              {sessionCoaches.length > 3 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: "#92400e", padding: "1px 5px",
                  borderRadius: 20, background: "#fef9c3", border: "0.5px solid #fde68a"
                }}>
                  +{sessionCoaches.length - 3}
                </span>
              )}
            </>}
          </div>
        </div>{/* end bordered header */}
        {(() => {
          const lifts = s.lifts || {};
          const liftPeople = Object.keys(lifts);
          const offering = liftPeople.filter(p => getLiftPref(lifts[p]) === "offer").length;
          const needing = liftPeople.filter(p => getLiftPref(lifts[p]) === "need").length;
          const ownT = liftPeople.filter(p => getLiftPref(lifts[p]) === "self").length;
          if (!offering && !needing && !ownT) return null;
          const parts = [];
          if (offering) parts.push(`🚘 ${offering}`);
          if (needing) parts.push(`🙋 ${needing}`);
          if (ownT) parts.push(`🚀 ${ownT}`);
          return (
            <div style={{ marginTop: 4 }}>
              <span
                onClick={onCarpoolClick ? e => { e.stopPropagation(); onCarpoolClick(); } : undefined}
                style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 20,
                  background: "#f0fdf4", color: "#166534", border: "0.5px solid #86efac",
                  display: "inline-flex", alignItems: "center", gap: 4,
                  cursor: onCarpoolClick ? "pointer" : "default"
                }}>
                {parts.join("  ")}
                <span style={{ fontWeight: 500, opacity: .7 }}>· car pool</span>
              </span>
            </div>
          );
        })()}
        {/* Player name chips — compact */}
        <div style={{ marginTop: 5, display: "flex", flexWrap: "wrap", gap: 2 }}>
          {s.players.slice(0, 12).map((p, i) => {
            const mem = members.find(m => m.name === p);
            const firstTeam = (mem?.teams || [])[0] || null;
            const tm = getTeamMeta(firstTeam || "Unassigned");
            return <span key={i} style={{
              background: tm.bg, color: tm.text, borderRadius: 20,
              padding: "0px 5px", fontSize: 9, fontWeight: 600, whiteSpace: "nowrap"
            }}>{p}</span>;
          })}
          {s.players.length > 12 && <span style={{
            fontSize: 9, color: G.muted, padding: "0 3px",
            fontWeight: 600
          }}>+{s.players.length - 12}</span>}
        </div>
      </div>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        marginLeft: 10, flexShrink: 0
      }}>
        <GroupIcon color={G.green} size={20} />
        <span style={{ fontWeight: 900, fontSize: 13, color: G.green, lineHeight: 1 }}>
          {s.players.length}
        </span>
      </div>
    </div>
  );
}

// ─── Bottom nav ───────────────────────────────────────────────
function BotNav({ view, setView, userRole, pendingCount = 0 }) {
  const isAdmin = can(userRole, "accessMembers");
  const active = view === "session" ? "schedule" : view === "roleAdmin" ? "admin" : view;

  const IconSchedule = ({ on }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor"
      strokeWidth={on ? 0 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      {on ? <>
        <rect x="3" y="4" width="18" height="18" rx="2" fill={G.green} stroke="none" />
        <line x1="16" y1="2" x2="16" y2="6" stroke={G.green} strokeWidth="2.5" />
        <line x1="8" y1="2" x2="8" y2="6" stroke={G.green} strokeWidth="2.5" />
        <line x1="3" y1="10" x2="21" y2="10" stroke="white" strokeWidth="1.8" />
        <rect x="7" y="13" width="3" height="3" rx="0.5" fill="white" />
        <rect x="11" y="13" width="3" height="3" rx="0.5" fill="white" />
      </> : <>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </>}
    </svg>
  );
  const IconMembers = ({ on }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={on ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
  const IconProfile = ({ on }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={on ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );

  const Tab = ({ id, icon, label, badge }) => {
    const on = active === id;
    return (
      <button onClick={() => setView(id)} style={{
        background: "none", border: "none", cursor: "pointer",
        fontFamily: "'DM Sans',sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 0, width: "100%", padding: "6px 4px 2px",
        position: "relative",
      }}>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          padding: "6px 14px 5px",
          borderRadius: 14,
          background: on
            ? `linear-gradient(175deg, #1a6b38 0%, #14532d 55%, #0f3d21 100%)`
            : "transparent",
          border: on
            ? `1.5px solid rgba(255,255,255,0.12)`
            : "1.5px solid transparent",
          boxShadow: on
            ? `0 2px 8px rgba(20,83,45,.45), inset 0 1px 0 rgba(255,255,255,.15), inset 0 -1px 0 rgba(0,0,0,.2)`
            : "none",
          transition: "all .18s",
          position: "relative",
        }}>
          <div style={{
            color: on ? G.lime : "#94a3b8",
            transition: "color .15s",
            position: "relative",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {icon}
            {badge > 0 && (
              <span style={{
                position: "absolute", top: -5, right: -8,
                background: "#ef4444", color: "#fff", borderRadius: 99,
                fontSize: 9, fontWeight: 900, minWidth: 15, height: 15,
                display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px"
              }}>
                {badge}
              </span>
            )}
          </div>
          <span style={{
            fontSize: 10, fontWeight: on ? 800 : 600, letterSpacing: .3,
            color: on ? G.lime : "#94a3b8",
            transition: "color .15s",
          }}>{label}</span>
        </div>
      </button>
    );
  };

  const IconBook = ({ on }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={on ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="7" x2="12" y2="17" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  );

  return (
    <div className="fcc-mobile-only" style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 500, zIndex: 200,
      background: "rgba(255,255,255,0.98)",
      backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      borderTop: "1px solid rgba(0,0,0,0.06)",
      boxShadow: "0 -6px 32px rgba(0,0,0,0.10), 0 -1px 0 rgba(0,0,0,0.04)",
      display: "grid",
      gridTemplateColumns: isAdmin ? "1fr 1fr 1fr 1fr" : "1fr 1fr 1fr",
      alignItems: "center",
      padding: "6px 8px",
      paddingBottom: "max(10px, env(safe-area-inset-bottom))",
      gap: 4,
    }}>
      <Tab id="schedule" icon={<IconSchedule on={active === "schedule"} />} label="Schedule" />

      {/* Book */}
      <button onClick={() => setView("add")} style={{
        background: "none", border: "none", cursor: "pointer",
        fontFamily: "'DM Sans',sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", width: "100%", padding: "6px 4px 2px",
      }}>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          padding: "6px 14px 5px",
          borderRadius: 14,
          background: active === "add"
            ? `linear-gradient(175deg, #1a6b38 0%, #14532d 55%, #0f3d21 100%)`
            : "transparent",
          border: active === "add"
            ? `1.5px solid rgba(255,255,255,0.12)`
            : "1.5px solid transparent",
          boxShadow: active === "add"
            ? `0 2px 8px rgba(20,83,45,.45), inset 0 1px 0 rgba(255,255,255,.15), inset 0 -1px 0 rgba(0,0,0,.2)`
            : "none",
          transition: "all .18s",
        }}>
          <div style={{
            color: active === "add" ? G.lime : "#94a3b8",
            transition: "color .15s",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <IconBook on={active === "add"} />
          </div>
          <span style={{
            fontSize: 10, fontWeight: active === "add" ? 800 : 600, letterSpacing: .3,
            color: active === "add" ? G.lime : "#94a3b8",
            transition: "color .15s",
          }}>Book</span>
        </div>
      </button>

      {isAdmin && (
        <Tab id="admin" icon={<IconMembers on={active === "admin"} />} label="Admin" badge={pendingCount} />
      )}
      <Tab id="profile" icon={<IconProfile on={active === "profile"} />} label="Profile" />
    </div>
  );
}

// ─── Desktop Sidebar Nav ──────────────────────────────────────
function SidebarNav({ view, setView, userRole, currentUser, onLogout }) {
  const isAdmin = can(userRole, "accessMembers");
  const active = view === "session" ? "schedule" : view === "roleAdmin" ? "admin" : view;

  const navBtn = (v, icon, label) => (
    <button key={v} onClick={() => setView(v)} style={{
      display: "flex", alignItems: "center", gap: 12, width: "100%",
      padding: "11px 14px", borderRadius: 10, border: "none", cursor: "pointer",
      fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 14,
      background: active === v ? "rgba(255,255,255,.18)" : "transparent",
      color: active === v ? "#fff" : "rgba(255,255,255,.6)",
      transition: "all .15s", textAlign: "left",
    }}>{icon} {label}</button>
  );

  return (
    <div className="fcc-sidebar">
      <img src={FCC_LOGO} alt="FCC" className="fcc-sidebar-logo" />
      <div>
        <div className="fcc-sidebar-title">FCC Training</div>
        <div className="fcc-sidebar-sub" style={{ marginTop: 4 }}>Fredensborg CC</div>
      </div>
      <div className="fcc-sidebar-links">
        {navBtn("schedule", "📅", "Schedule")}
        {navBtn("add", "＋", "Book / Join")}
        {isAdmin && navBtn("admin", "👥", "Admin Panel")}
        {(isAdmin || isCoachMember(currentUser?.name, [])) && navBtn("availability", "📊", "Team Availability")}
        {navBtn("profile", "👤", "My Profile")}
      </div>
      <div style={{
        marginTop: "auto", width: "100%", paddingTop: 24,
        borderTop: "1px solid rgba(255,255,255,.15)"
      }}>
        <div style={{
          color: "rgba(255,255,255,.7)", fontSize: 13, fontWeight: 700,
          marginBottom: 8, paddingLeft: 4
        }}>{currentUser?.name}</div>
        <button onClick={onLogout} style={{
          width: "100%", padding: "9px 14px", borderRadius: 10, border: "none",
          background: "rgba(255,255,255,.12)", color: "rgba(255,255,255,.7)",
          fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 13,
          cursor: "pointer", textAlign: "left",
        }}>Sign out</button>
      </div>
    </div>
  );
}

// ─── Shell ────────────────────────────────────────────────────
function Shell({ children, sidebar }) {
  return (
    <div style={{
      fontFamily: "'DM Sans',sans-serif", background: G.bg, minHeight: "100vh",
      display: "flex", justifyContent: "center", alignItems: "flex-start"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,700;0,800;0,900;1,400&family=Playfair+Display:wght@700;900&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{transform:translateX(-50%) translateY(100%)}to{transform:translateX(-50%) translateY(0)}}
        @media(min-width:900px){
          .fcc-sidebar{
            display:flex!important;flex-direction:column;align-items:flex-start;
            padding:40px 28px;width:240px;flex-shrink:0;
            min-height:100vh;position:sticky;top:0;align-self:flex-start;
            background:${G.green};gap:20px;
          }
          .fcc-sidebar-logo{width:72px;height:72px;border-radius:50%;object-fit:cover;
            border:3px solid rgba(255,255,255,.3);display:block;}
          .fcc-sidebar-title{font-family:'Playfair Display',serif;font-weight:900;
            font-size:20px;color:#fff;line-height:1.2;}
          .fcc-sidebar-sub{font-size:11px;color:rgba(255,255,255,.45);letter-spacing:2px;
            text-transform:uppercase;margin-top:2px;}
          .fcc-sidebar-links{display:flex;flex-direction:column;gap:4px;width:100%;margin-top:4px;}
          .fcc-mobile-only{display:none!important;}
          .fcc-app-pane{max-width:520px;width:100%;min-height:100vh;
            border-left:1px solid ${G.border};border-right:1px solid ${G.border};}
        }
        @media(max-width:899px){
          .fcc-sidebar{display:none!important;}
          .fcc-app-pane{max-width:500px;width:100%;margin:0 auto;}
          .fcc-header-logo{width:72px!important;height:72px!important;}
        }
      `}</style>
      {/* Sidebar slot — only visible on desktop via CSS */}
      {sidebar && <div className="fcc-sidebar">{sidebar}</div>}
      {/* Main content pane */}
      <div className="fcc-app-pane" style={{ position: "relative", paddingBottom: 90, background: G.bg }}>
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [sessions, setSessions] = useState([]);
  const [members, setMembers] = useState([]);
  const [pins, setPins] = useState({});   // { memberId: hashedPin }
  const [loading, setLoading] = useState(true);

  // Theme
  const [themeKey, setThemeKey] = useState(_themeKey);
  G = THEMES[themeKey] || THEMES.forest; // keep global G in sync for atoms
  const applyTheme = (key) => {
    if (!THEMES[key]) return;
    setThemeKey(key);
    G = THEMES[key];
    try { localStorage.setItem("fcc-theme", key); } catch { }
  };

  // Auth state — restore from localStorage if previously logged in
  const [currentUser, setCurrentUser] = useState(() => {
    try { const s = localStorage.getItem("fcc-current-user"); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [authView, setAuthView] = useState("pick");
  const [pickSearch, setPickSearch] = useState("");
  const [pinError, setPinError] = useState("");
  const [pendingMember, setPendingMember] = useState(null);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");
  // Invite codes for members without email — { memberId: hashedCode }
  const [inviteCodes, setInviteCodes] = useState({});
  // Join requests from non-members
  const [joinRequests, setJoinRequests] = useState([]);
  // Superadmin-only audit log
  const [auditLog, setAuditLog] = useState([]);

  // App view
  const [view, setView] = useState("schedule");
  const [selSess, setSelSess] = useState(null);
  const [toast, setToast] = useState(null);

  // Dynamic teams
  const [teams, setTeams] = useState(DEFAULT_TEAMS);
  const seniorTeamNames = teams.filter(t => t.senior).map(t => t.name);
  const ALL_TEAMS = [...teams.map(t => t.name), "Unassigned"];

  // Recurring slots
  const [recurring, setRecurring] = useState([]);

  // Add session form
  const [bDate, setBDate] = useState("");
  const [bFrom, setBFrom] = useState("18:00");
  const [bTo, setBTo] = useState("19:00");
  const [bNote, setBNote] = useState("");
  const [bLabel, setBLabel] = useState("");
  const [bNet, setBNet] = useState("1");  // "1" | "2" | "both"
  const [bLift, setBLift] = useState("");   // "" | "offer" | "need" | "self"
  const [liftEditing, setLiftEditing] = useState(false);  // carpool form open in session detail
  const [liftDraft, setLiftDraft] = useState(null);   // draft lift object while editing
  const [carpoolFocus, setCarpoolFocus] = useState(false);  // auto-scroll to carpool on open
  const [notInExpanded, setNotInExpanded] = useState(false); // "not coming" section toggle
  const [carpoolSheetSess, setCarpoolSheetSess] = useState(null); // bottom sheet session
  const carpoolRef = useRef(null);
  const sessionsRef = useRef([]); // always holds latest sessions, avoids stale closure in recurring effect
  const membersRef = useRef([]); // same for members
  const teamsRef = useRef(DEFAULT_TEAMS); // same for teams
  const [bRestrictTeam, setBRestrictTeam] = useState("");
  const [selP, setSelP] = useState([]);
  const [pSearch, setPSearch] = useState("");
  const [pFilter, setPFilter] = useState("All");
  const [otherGroupsOpen, setOtherGroupsOpen] = useState(false);
  // Poll builder
  const [bPollOpts, setBPollOpts] = useState([...PRESET_POLL]);
  const [bCustomOpt, setBCustomOpt] = useState("");
  // Session comments
  const [commentText, setCommentText] = useState("");

  // Admin state
  const [newName, setNewName] = useState("");
  const [newTeam, setNewTeam] = useState("Unassigned");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [aSearch, setASearch] = useState("");
  const [aFilter, setAFilter] = useState("All");
  const [editingRole, setEditingRole] = useState(null);

  // Team management state
  const [newTName, setNewTName] = useState("");
  const [newTSenior, setNewTSenior] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [coachSearch, setCoachSearch] = useState({}); // {teamId: searchString}
  // Admin section collapse — true = open. Members+AddMember open by default, rest collapsed
  const [adminSec, setAdminSec] = useState({
    members: true, addmember: true, groups: false,
    coaches: false, blocknets: false, recurring: false, auditlog: false
  });
  const toggleAdminSec = k => setAdminSec(s => ({ ...s, [k]: !s[k] }));
  const [editingName, setEditingName] = useState(null); // {id, value}

  // Recurring slot form state
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const [rName, setRName] = useState("");
  const [rTeam, setRTeam] = useState([]);  // array for multi-select
  const [rRestrict, setRRestrict] = useState(false);
  const [rDay, setRDay] = useState(6); // Saturday
  const [rFrom, setRFrom] = useState("14:00");
  const [rTo, setRTo] = useState("15:30");
  const [rActiveFrom, setRActiveFrom] = useState(todayStr());
  const [rActiveTo, setRActiveTo] = useState("");
  const [rNet, setRNet] = useState("1"); // net for new recurring slot
  const [editingSlot, setEditingSlot] = useState(null);
  // Permanently dismissed missing-member names (persisted in localStorage)
  const [dismissedMissing, setDismissedMissing] = useState(() => {
    try { return JSON.parse(localStorage.getItem("fcc-dismissed-missing") || "[]"); } catch { return []; }
  });

  // Help / contact form
  const [helpMsg, setHelpMsg] = useState("");
  const [helpCat, setHelpCat] = useState("general");
  // Audit log UI state (superadmin only — safe to have at component level)
  const [logFilter, setLogFilter] = useState("all");
  const [logOpen, setLogOpen] = useState(false);
  // Request-to-join form state
  const [jrName, setJrName] = useState("");
  const [jrTeam, setJrTeam] = useState("");
  const [jrContact, setJrContact] = useState(""); // email
  const [jrPhone, setJrPhone] = useState(""); // phone (separate)
  const [jrForChild, setJrForChild] = useState(false);
  const [jrChildName, setJrChildName] = useState("");
  const [jrChildTeam, setJrChildTeam] = useState("");

  // ── Self-service verify/onboarding flow ────────────────────
  const [vfStep, setVfStep] = useState("search");   // search|found|notfound|code|parent|done
  const [vfSearch, setVfSearch] = useState("");
  const [vfMatch, setVfMatch] = useState(null);        // matched member object
  const [vfEmail, setVfEmail] = useState("");
  const [vfPhone, setVfPhone] = useState("");
  const [vfCode, setVfCode] = useState("");          // entered code
  const [vfSentCode, setVfSentCode] = useState("");          // generated code (client-side ephemeral)
  const [vfCodeExpiry, setVfCodeExpiry] = useState(null);
  const [vfSending, setVfSending] = useState(false);
  const [vfError, setVfError] = useState("");
  const [vfConsent, setVfConsent] = useState(false);
  const [vfIsParent, setVfIsParent] = useState(false);
  const [vfChildName, setVfChildName] = useState("");
  const [vfNewName, setVfNewName] = useState("");
  const [vfNewTeam, setVfNewTeam] = useState("");

  const userRole = currentUser?.role || "member";
  const showToast = m => { setToast(m); setTimeout(() => setToast(null), 2700); };

  // Keep cached currentUser in sync if their role/team changes in Firebase
  useEffect(() => {
    if (!currentUser || members.length === 0) return;
    const fresh = members.find(m => m.id === currentUser.id);
    if (fresh && (fresh.role !== currentUser.role
      || JSON.stringify(fresh.teams) !== JSON.stringify(currentUser.teams)
      || fresh.name !== currentUser.name)) {
      setCurrentUser(fresh);
      localStorage.setItem("fcc-current-user", JSON.stringify(fresh));
    }
  }, [members]);

  // ── Load + real-time sync via Firestore ──────────────────────
  useEffect(() => {
    const refs = {
      sessions: doc(db, "fccnets", "sessions"),
      members: doc(db, "fccnets", "members"),
      pins: doc(db, "fccnets", "pins"),
      teams: doc(db, "fccnets", "teams"),
      recurring: doc(db, "fccnets", RECURRING_KEY),
      blockcals: doc(db, "fccnets", "blockcals"),
      invitecodes: doc(db, "fccnets", "invitecodes"),
      joinrequests: doc(db, "fccnets", JOINREQS_KEY),
      auditlog: doc(db, "fccnets", AUDITLOG_KEY),
    };
    (async () => {
      try {
        const [sr, mr, pr, tr, rr, br, ir, jr, ar] = await Promise.all([
          getDoc(refs.sessions),
          getDoc(refs.members),
          getDoc(refs.pins),
          getDoc(refs.teams),
          getDoc(refs.recurring),
          getDoc(refs.blockcals),
          getDoc(refs.invitecodes),
          getDoc(refs.joinrequests),
          getDoc(refs.auditlog),
        ]);
        // Sessions MUST be loaded before setLoading(false) so sessionsRef is
        // populated before the recurring useEffect runs — prevents lifts being wiped
        const initialSessions = sr.exists() ? JSON.parse(sr.data().value) : [];
        setSessions(initialSessions);
        sessionsRef.current = initialSessions;
        let initialMembers = mr.exists() ? JSON.parse(mr.data().value).map(normMember) : SEED_MEMBERS.map(normMember);
        // Clean out legacy T20 tags to avoid duplicates with manual groups
        initialMembers = initialMembers.map(m => {
          if (!m.teams) return m;
          const filtered = m.teams.filter(t => !t.startsWith("T20 Serie 4") && !t.startsWith("T20 Serie 5"));
          return filtered.length === m.teams.length ? m : { ...m, teams: filtered };
        });
        setMembers(initialMembers);
        membersRef.current = initialMembers;
        if (mr.exists()) setDoc(doc(db, "fccnets", "members"), { value: JSON.stringify(initialMembers) }).catch(() => { });
        setPins(pr.exists() ? JSON.parse(pr.data().value) : {});
        // Merge coaches from DEFAULT_TEAMS into stored teams (adds coaches field if missing)
        const storedTeams = tr.exists() ? JSON.parse(tr.data().value) : DEFAULT_TEAMS;
        const mergedTeams = storedTeams.map(t => {
          const def = DEFAULT_TEAMS.find(d => d.name === t.name);
          return { ...t, coaches: t.coaches ?? def?.coaches ?? [] };
        });
        setTeams(mergedTeams);
        teamsRef.current = mergedTeams;
        setRecurring(rr.exists() ? JSON.parse(rr.data().value) : []);
        setBlockCals(br.exists() ? JSON.parse(br.data().value) : []);
        setInviteCodes(ir.exists() ? JSON.parse(ir.data().value) : {});
        setJoinRequests(jr.exists() ? JSON.parse(jr.data().value) : []);
        setAuditLog(ar.exists() ? JSON.parse(ar.data().value) : []);
      } catch (e) {
        setMembers(SEED_MEMBERS.map(normMember)); setPins({}); setTeams(DEFAULT_TEAMS); setRecurring([]); setBlockCals([]); setInviteCodes({}); setJoinRequests([]); setAuditLog([]);
      }
      setLoading(false);
    })();
    // onSnapshot keeps sessions live for real-time updates after initial load
    const unsub = onSnapshot(refs.sessions, snap => {
      const val = snap.exists() ? JSON.parse(snap.data().value) : [];
      setSessions(val);
      sessionsRef.current = val;
    }, () => { setSessions([]); sessionsRef.current = []; });
    return () => unsub();
  }, []);

  const saveSessions = async u => { setSessions(u); sessionsRef.current = u; await setDoc(doc(db, "fccnets", "sessions"), { value: JSON.stringify(u) }).catch(() => { }); };
  const saveMembers = async u => { setMembers(u); membersRef.current = u; await setDoc(doc(db, "fccnets", "members"), { value: JSON.stringify(u) }).catch(() => { }); };
  const savePins = async u => { setPins(u); await setDoc(doc(db, "fccnets", "pins"), { value: JSON.stringify(u) }).catch(() => { }); };
  const saveTeams = async u => { setTeams(u); teamsRef.current = u; await setDoc(doc(db, "fccnets", "teams"), { value: JSON.stringify(u) }).catch(() => { }); };
  const saveRecurring = async u => { setRecurring(u); await setDoc(doc(db, "fccnets", RECURRING_KEY), { value: JSON.stringify(u) }).catch(() => { }); };
  const saveBlockCals = async u => { setBlockCals(u); await setDoc(doc(db, "fccnets", "blockcals"), { value: JSON.stringify(u) }).catch(() => { }); };
  const saveInviteCodes = async u => { setInviteCodes(u); await setDoc(doc(db, "fccnets", "invitecodes"), { value: JSON.stringify(u) }).catch(() => { }); };
  const saveJoinRequests = async u => { setJoinRequests(u); await setDoc(doc(db, "fccnets", JOINREQS_KEY), { value: JSON.stringify(u) }).catch(() => { }); };

  // ── Audit log ─────────────────────────────────────────────────
  // Cap at 500 entries; newest first. Only superadmin can read.
  const saveAuditLog = async u => {
    setAuditLog(u);
    await setDoc(doc(db, "fccnets", AUDITLOG_KEY), { value: JSON.stringify(u) }).catch(() => { });
  };
  function logAction(category, detail) {
    if (!currentUser) return;
    const entry = {
      id: uid(),
      ts: new Date().toISOString(),
      byId: currentUser.id,
      byName: currentUser.name,
      byRole: currentUser.role || "member",
      category, // e.g. "member", "role", "team", "session", "pin", "request", "system"
      detail,   // human-readable description
    };
    setAuditLog(prev => {
      const next = [entry, ...prev].slice(0, 500);
      setDoc(doc(db, "fccnets", AUDITLOG_KEY), { value: JSON.stringify(next) }).catch(() => { });
      return next;
    });
  }

  // ── Auto-generate recurring sessions ─────────────────────────
  useEffect(() => {
    if (loading || recurring.length === 0) return;
    const liveSessions = sessionsRef.current;
    const liveMembers = membersRef.current; // use ref to avoid stale closure
    const liveTeams = teamsRef.current;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const toAdd = [];
    recurring.forEach(slot => {
      if (!slot.enabled) return;
      for (let i = 0; i <= 28; i++) {
        const d = new Date(today); d.setDate(today.getDate() + i);
        if (d.getDay() !== slot.day) continue;
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (slot.activeFrom && dateStr < slot.activeFrom) continue;
        if (slot.activeTo && dateStr > slot.activeTo) continue;
        const exists = liveSessions.find(s =>
          s.recurringId === slot.id && s.date === dateStr);
        if (!exists) {
          // Auto-enroll members from the slot's teams
          const slotTeams = slot.teams?.length ? slot.teams : (slot.team ? [slot.team] : []);
          const autoPlayers = slotTeams.length
            ? liveMembers.filter(m =>
              (m.teams || []).some(t => slotTeams.includes(t)) &&
              !isAbsent(m, dateStr) // skip members marked away
            ).map(m => m.name)
            : [];
          // Collect coaches from all slot teams
          const slotCoaches = [...new Set(slotTeams.flatMap(tn => {
            const teamDef = (liveTeams || DEFAULT_TEAMS).find(t => t.name === tn);
            return teamDef?.coaches || [];
          }))];
          toAdd.push({
            id: uid(), date: dateStr, from: slot.from, to: slot.to,
            label: slot.name, note: "", players: autoPlayers, poll: [],
            restrictedTo: slot.restrictTeam ? slot.team : null,
            sessionTeams: slotTeams,
            coaches: slotCoaches,
            recurringId: slot.id,
            net: slot.net || "1",
            lifts: {},
          });
        }
      }
    });
    if (toAdd.length > 0) {
      const merged = [...liveSessions, ...toAdd].sort((a, b) =>
        new Date(a.date) - new Date(b.date) || a.from.localeCompare(b.from));
      saveSessions(merged);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, recurring]);

  // ── Invite code helpers ───────────────────────────────────────
  // Generate a short human-readable code: FCC-XXXX (letters+digits, no ambiguous chars)
  function genCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return "FCC-" + Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }
  function hashCode(code) { return hashPin(code.toUpperCase()); }

  function generateInviteCode(memberId) {
    const m = members.find(x => x.id === memberId);
    const plain = genCode();
    const updated = { ...inviteCodes, [memberId]: hashCode(plain) };
    saveInviteCodes(updated);
    if (m) logAction("pin", `Generated invite code for: ${m.name}`);
    showToast(`Code for member: ${plain}`);
    return plain;
  }

  // ── Auth flow ─────────────────────────────────────────────────
  async function handlePickMember(member) {
    setPendingMember(member);
    setPinError("");
    setEmailInput("");
    setEmailError("");
    if (pins[member.id]) {
      // Returning user — straight to PIN
      setAuthView("enterpin");
      return;
    }
    // First-time login — do a fresh fetch of invitecodes from Firebase
    // (the in-memory state may be stale if a code was generated after page load)
    let freshCodes = inviteCodes;
    try {
      const snap = await getDoc(doc(db, "fccnets", "invitecodes"));
      if (snap.exists()) {
        freshCodes = JSON.parse(snap.data().value);
        setInviteCodes(freshCodes); // sync state too
      }
    } catch (e) { /* use cached value on error */ }

    const seedEmail = EMAIL_SEED[member.name];
    const storedEmail = member.email;
    const hasInviteCode = !!freshCodes[member.id];
    if (hasInviteCode) {
      setAuthView("verifycode");
    } else if (seedEmail || storedEmail) {
      setAuthView("verifyemail");
    } else {
      // No email, no invite code — account not set up yet, block access
      setAuthView("blocked");
    }
  }

  function handleVerifyEmail() {
    const seed = EMAIL_SEED[pendingMember.name] || "";
    const stored = (pendingMember.email || "").trim().toLowerCase();
    const typed = emailInput.trim().toLowerCase();
    const expected = stored || seed;
    if (!typed) { setEmailError("Please enter your email address"); return; }
    if (typed !== expected) {
      setEmailError("Email doesn't match our records. Try again or contact your admin.");
      return;
    }
    // Passed — also write email to member record if not already stored
    if (!stored && seed) {
      const updated = members.map(m => m.id === pendingMember.id ? { ...m, email: seed } : m);
      saveMembers(updated);
    }
    setEmailError("");
    setAuthView("newpin");
  }

  function handleVerifyCode() {
    const typed = emailInput.trim().toUpperCase();
    if (!typed) { setEmailError("Please enter your invite code"); return; }
    if (hashCode(typed) !== inviteCodes[pendingMember.id]) {
      setEmailError("Invalid code. Check with your admin and try again.");
      return;
    }
    // Passed — clear the used code so it can't be reused
    const updated = { ...inviteCodes };
    delete updated[pendingMember.id];
    saveInviteCodes(updated);
    setEmailError("");
    setAuthView("newpin");
  }

  function handleNewPin(pin) {
    const updated = { ...pins, [pendingMember.id]: hashPin(pin) };
    savePins(updated);
    setCurrentUser(pendingMember);
    localStorage.setItem("fcc-current-user", JSON.stringify(pendingMember));
    setPendingMember(null);
    setAuthView("pick");
    showToast(`Welcome, ${pendingMember.name.split(" ")[0]}! PIN set ✓`);
  }

  function handleEnterPin(pin) {
    if (hashPin(pin) === pins[pendingMember.id]) {
      setCurrentUser(pendingMember);
      localStorage.setItem("fcc-current-user", JSON.stringify(pendingMember));
      setPendingMember(null);
      setPinError("");
      setAuthView("pick");
      showToast(`Welcome back, ${pendingMember.name.split(" ")[0]}! 👋`);
    } else {
      setPinError("Wrong PIN, try again");
      setTimeout(() => setPinError(""), 2000);
    }
  }

  function handleLogout() {
    setCurrentUser(null);
    localStorage.removeItem("fcc-current-user");
    setAuthView("pick");
    setPickSearch("");
    setView("schedule");
  }

  // ── Auto-scroll to carpool section when chip clicked ─────────
  useEffect(() => {
    if (view === "session" && carpoolFocus && carpoolRef.current) {
      setTimeout(() => {
        carpoolRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
      setCarpoolFocus(false);
    }
  }, [view, carpoolFocus]);

  // ── Auto-select current user when opening Add Session ────────
  useEffect(() => {
    if (view === "add" && currentUser) {
      setSelP(ps => ps.includes(currentUser.name) ? ps : [currentUser.name, ...ps]);
      setPSearch(""); setPFilter("All"); setOtherGroupsOpen(false);
    }
  }, [view]);

  // ── Weather fetch (Open-Meteo ECMWF — free, CORS-enabled) ────
  useEffect(() => {
    function fetchWx() {
      const url = `https://api.open-meteo.com/v1/forecast?` +
        `latitude=${FCC_LAT}&longitude=${FCC_LON}` +
        `&current=temperature_2m,apparent_temperature,precipitation,` +
        `weathercode,windspeed_10m,is_day` +
        `&hourly=temperature_2m,apparent_temperature,precipitation,` +
        `precipitation_probability,weathercode,windspeed_10m,visibility,is_day` +
        `&daily=sunrise,sunset,precipitation_sum,weathercode,` +
        `temperature_2m_max,temperature_2m_min,windspeed_10m_max,` +
        `precipitation_probability_max` +
        `&timezone=Europe%2FCopenhagen&forecast_days=7&wind_speed_unit=ms`;
      fetch(url, { cache: "no-store" })
        .then(r => r.json())
        .then(data => {
          const todayD = localDateStr();
          const daily = (data.daily?.time || []).map((date, i) => ({
            date,
            code: data.daily.weathercode[i],
            max: Math.round(data.daily.temperature_2m_max[i]),
            min: Math.round(data.daily.temperature_2m_min[i]),
            windMax: Math.round(data.daily.windspeed_10m_max[i] * 10) / 10,
            rainSum: +(data.daily.precipitation_sum[i] || 0).toFixed(1),
            rainProb: data.daily.precipitation_probability_max[i] || 0,
            sunrise: data.daily.sunrise[i],
            sunset: data.daily.sunset[i],
          }));
          setWxData({
            today: todayD,
            hourly: data.hourly,
            daily: daily,
            daily0: daily[0],
            // Current conditions from the /current endpoint
            current: data.current ? {
              temp: Math.round(data.current.temperature_2m),
              feels: Math.round(data.current.apparent_temperature),
              precip: +(data.current.precipitation || 0).toFixed(1),
              code: data.current.weathercode,
              wind: Math.round(data.current.windspeed_10m * 10) / 10,
              isDay: data.current.is_day,
            } : null,
            fetchedAt: Date.now(),
          });
        })
        .catch(() => setWxData({ error: true }));
    }
    fetchWx();
    // Re-fetch every 30 minutes so temperature stays current
    const timer = setInterval(fetchWx, 30 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);


  function addTeam(e) {
    e.preventDefault();
    const n = newTName.trim();
    if (!n) return;
    if (teams.find(t => t.name.toLowerCase() === n.toLowerCase())) {
      showToast("A team with that name already exists"); return;
    }
    saveTeams([...teams, { id: uid(), name: n, senior: newTSenior }]);
    logAction("group", `Created group: "${n}" (${newTSenior ? "Senior" : "Youth"})`);
    setNewTName(""); setNewTSenior(false);
    showToast(`Group "${n}" added ✓`);
  }

  function renameTeam(id, newName) {
    const n = newName.trim();
    if (!n) return;
    const old = teams.find(t => t.id === id)?.name;
    if (!old) return;
    saveMembers(members.map(m => m.team === old ? { ...m, team: n } : m));
    saveTeams(teams.map(t => t.id === id ? { ...t, name: n } : t));
    logAction("group", `Renamed group: "${old}" → "${n}"`);
    setEditingTeam(null);
    showToast(`Renamed to "${n}" ✓`);
  }

  function deleteTeam(id) {
    const t = teams.find(t => t.id === id);
    if (!t) return;
    if (!window.confirm(`Delete group "${t.name}"? Members in this group will be moved to Unassigned.`)) return;
    saveMembers(members.map(m => m.team === t.name ? { ...m, team: null, role: "member" } : m));
    saveTeams(teams.filter(t => t.id !== id));
    logAction("group", `Deleted group: "${t.name}"`);
    showToast(`Group "${t.name}" deleted`);
  }

  function toggleTeamSenior(id) {
    const t = teams.find(t => t.id === id);
    if (!t) return;
    if (t.senior) {
      saveMembers(members.map(m =>
        m.team === t.name && ["captain", "vicecaptain"].includes(m.role)
          ? { ...m, role: "member" } : m
      ));
    }
    saveTeams(teams.map(t => t.id === id ? { ...t, senior: !t.senior } : t));
    logAction("group", `Changed "${t.name}" type: ${t.senior ? "Senior→Youth" : "Youth→Senior"}`);
    showToast(`"${t.name}" set to ${t.senior ? "Youth" : "Senior"} ✓`);
  }

  // ── Recurring slots ───────────────────────────────────────────
  function addRecurringSlot(slot) {
    const next = [...recurring, { ...slot, id: uid(), enabled: true }];
    saveRecurring(next);
    logAction("recurring", `Added recurring slot: "${slot.name}" (${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][slot.day]}, ${slot.from}–${slot.to}${slot.team ? ", " + slot.team : ""})`);
    showToast(`Recurring slot "${slot.name}" added ✓`);
  }
  function toggleRecurringSlot(id) {
    const slot = recurring.find(r => r.id === id);
    const next = recurring.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r);
    saveRecurring(next);
    if (slot) logAction("recurring", `${slot.enabled ? "Disabled" : "Enabled"} recurring slot: "${slot.name}"`);
  }
  function deleteRecurringSlot(id) {
    const slot = recurring.find(r => r.id === id);
    if (!slot) return;
    if (!window.confirm(`Delete recurring slot "${slot.name}"? Existing sessions from this slot are kept.`)) return;
    saveRecurring(recurring.filter(r => r.id !== id));
    logAction("recurring", `Deleted recurring slot: "${slot.name}"`);
    showToast(`Slot "${slot.name}" deleted`);
  }
  function deleteRecurringSlotSilent(id) {
    // No confirm — used when checkbox is already the user's confirmation
    const slot = recurring.find(r => r.id === id);
    if (!slot) return;
    saveRecurring(recurring.filter(r => r.id !== id));
    logAction("recurring", `Deleted recurring slot: "${slot.name}"`);
  }
  function updateRecurringSlot(id, changes) {
    const slot = recurring.find(r => r.id === id);
    saveRecurring(recurring.map(r => r.id === id ? { ...r, ...changes } : r));
    if (slot) logAction("recurring", `Updated recurring slot: "${slot.name}" → "${changes.name || slot.name}"`);
    showToast("Slot updated ✓");
  }

  // ── Sessions ──────────────────────────────────────────────────
  // Returns true if two time ranges overlap (exclusive of touching endpoints)
  function timesOverlap(aFrom, aTo, bFrom, bTo) {
    const toMins = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    return toMins(aFrom) < toMins(bTo) && toMins(bFrom) < toMins(aTo);
  }

  function handleAddSession(e) {
    e.preventDefault();
    if (!bDate || selP.length === 0) { showToast("Pick a date & at least one player"); return; }
    const pollOptions = bPollOpts.map(o => ({ ...o, votes: [] }));
    const restrictedTo = bRestrictTeam || null;
    const isLeader = ["superadmin", "admin", "captain", "vicecaptain"].includes(userRole);
    const isAdmin = ["superadmin", "admin"].includes(userRole);

    if (!isAdmin) {
      const prime = (!isLeader) && isPrimeTime(bFrom, bDate);
      const maxMins = toMinsNet(bFrom) + (prime ? 60 : 120);
      if (toMinsNet(bTo) > maxMins) {
        const allowed = prime ? "1 hour" : "2 hours";
        const msg = prime ? `⭐ Prime hours: max ${allowed} per booking at this time` : `Maximum booking duration is ${allowed}`;
        showToast(msg);
        return;
      }
    }

    // Auto-enroll team members when session is restricted
    let autoPlayers = [...selP];
    if (isLeader && restrictedTo) {
      const teamMembers = members
        .filter(m => (m.teams || []).includes(restrictedTo))
        .map(m => m.name);
      autoPlayers = [...new Set([...autoPlayers, ...teamMembers])];
    }

    // Exact match — merge players into existing session (including recurring)
    const ex = sessions.find(s => s.date === bDate && s.from === bFrom && s.to === bTo && (s.net === "both" || bNet === "both" || s.net === bNet));
    if (ex) {
      const merged = [...new Set([...ex.players, ...autoPlayers])];
      const mergedPoll = ex.poll || [];
      const existingIds = mergedPoll.map(o => o.id);
      const newOpts = pollOptions.filter(o => !existingIds.includes(o.id));
      saveSessions(sessions.map(s => s.id === ex.id ? {
        ...s, players: merged,
        label: s.label || bLabel, restrictedTo: s.restrictedTo || restrictedTo,
        poll: [...mergedPoll, ...newOpts]
      } : s));
      logAction("session", `Added players to session on ${bDate} (${bFrom}–${bTo}): ${autoPlayers.join(", ")}`);
      showToast(`Players added to session on ${fmtShort(bDate)} ✓`);
    } else {
      // Check 1: net conflict — same net at overlapping time
      const netConflict = sessions.find(s =>
        s.date === bDate &&
        timesOverlap(bFrom, bTo, s.from, s.to) &&
        (s.net === "both" || bNet === "both" || s.net === bNet)
      ) || recurring.find(r => {
        if (!r.enabled) return false;
        const d = new Date(bDate);
        if (d.getDay() !== r.day) return false;
        if (r.activeFrom && bDate < r.activeFrom) return false;
        if (r.activeTo && bDate > r.activeTo) return false;
        return timesOverlap(bFrom, bTo, r.from, r.to) && (r.net === "both" || bNet === "both" || r.net === bNet);
      });
      if (netConflict) {
        showToast(`🚫 ${netConflict.net === "both" ? "Both nets are" :
          `Net ${netConflict.net} is`} already booked ${netConflict.from}–${netConflict.to}${netConflict.name ? " (Recurring)" : ""}`);
        return;
      }
      // Check 2: player conflict — same player in an overlapping session
      const overlapping = sessions.filter(s =>
        s.date === bDate && timesOverlap(bFrom, bTo, s.from, s.to)
      );
      const alreadyBooked = overlapping.filter(s =>
        autoPlayers.some(p => s.players.includes(p))
      );
      if (alreadyBooked.length > 0) {
        const clash = alreadyBooked[0];
        showToast(`⚠️ ${autoPlayers.find(p => clash.players.includes(p))} already has a session at this time (${clash.from}–${clash.to}${clash.label ? " · " + clash.label : ""})`);
        return;
      }
      const addedCount = autoPlayers.length - selP.length;
      saveSessions([...sessions, {
        id: uid(), date: bDate, from: bFrom, to: bTo,
        players: [...autoPlayers], note: bNote.trim(), label: bLabel.trim(),
        net: bNet,
        lifts: bLift && currentUser?.name ? { [currentUser.name]: { pref: bLift, seats: 1, stop: "", stopOther: "", note: "", saved: true } } : {},
        restrictedTo, poll: pollOptions, comments: []
      }]
        .sort((a, b) => new Date(a.date) - new Date(b.date)));
      logAction("session", `Created session: ${bDate} ${bFrom}–${bTo}${bLabel ? " «" + bLabel + "»" : ""}${restrictedTo ? " (" + restrictedTo + " only)" : ""} — ${autoPlayers.length} player${autoPlayers.length > 1 ? "s" : ""}: ${autoPlayers.join(", ")}`);
      const autoMsg = addedCount > 0 ? ` · ${addedCount} team member${addedCount > 1 ? "s" : ""} auto-enrolled` : "";
      showToast(`Session booked for ${fmtShort(bDate)} ✓${autoMsg}`);
    }
    setBDate(""); setBNote(""); setBLabel(""); setBRestrictTeam(""); setBNet("1"); setBLift("");
    setSelP([currentUser?.name].filter(Boolean)); setBPollOpts([...PRESET_POLL]); setBCustomOpt("");
    setView("schedule");
  }

  function setLiftPref(sessId, name, liftObj) {
    // liftObj: {pref,seats,stop,stopOther,note,saved} or "" to clear
    const updated = sessions.map(s => {
      if (s.id !== sessId) return s;
      const lifts = { ...(s.lifts || {}) };
      if (liftObj && liftObj.pref) lifts[name] = liftObj;
      else delete lifts[name];
      return { ...s, lifts };
    });
    saveSessions(updated);
    if (selSess?.id === sessId) {
      const newLifts = { ...(selSess.lifts || {}) };
      if (liftObj && liftObj.pref) newLifts[name] = liftObj;
      else delete newLifts[name];
      setSelSess({ ...selSess, lifts: newLifts });
    }
    setLiftEditing(false);
    setLiftDraft(null);
  }

  function handlePostComment(sessId, text) {
    if (!text.trim()) return;
    const comment = {
      id: uid(), name: currentUser.name, text: text.trim(),
      ts: new Date().toISOString()
    };
    saveSessions(sessions.map(s => s.id === sessId
      ? { ...s, comments: [...(s.comments || []), comment] }
      : s));
    setCommentText("");
  }

  function handleDeleteComment(sessId, commentId) {
    saveSessions(sessions.map(s => s.id === sessId
      ? { ...s, comments: (s.comments || []).filter(c => c.id !== commentId) }
      : s));
  }

  function handleVote(sessId, optionId) {
    const userName = currentUser.name;
    const updated = sessions.map(s => {
      if (s.id !== sessId) return s;
      const poll = (s.poll || []).map(o => {
        if (o.id !== optionId) return o;
        const hasVoted = (o.votes || []).includes(userName);
        return {
          ...o, votes: hasVoted
            ? o.votes.filter(v => v !== userName)
            : [...(o.votes || []), userName]
        };
      });
      return { ...s, poll };
    });
    saveSessions(updated);
    // Keep selSess in sync
    const found = updated.find(s => s.id === sessId);
    if (found) setSelSess(found);
  }

  function handleLeave(sessId, name) {
    const upd = sessions.map(s => s.id === sessId
      ? { ...s, players: s.players.filter(p => p !== name) } : s).filter(s => s.players.length > 0);
    saveSessions(upd);
    const found = upd.find(s => s.id === sessId);
    if (!found) { setView("schedule"); setSelSess(null); }
    else setSelSess(found);
    showToast("Removed from session");
  }

  function handleJoinDetail(name) {
    if (!selSess) return;
    if (selSess.players.includes(name)) { showToast("Already in this session"); return; }
    const upd = sessions.map(s => s.id === selSess.id ? { ...s, players: [...s.players, name] } : s);
    saveSessions(upd);
    setSelSess(upd.find(s => s.id === selSess.id));
    showToast(`${name.split(" ")[0]} added ✓`);
  }

  function handleDeleteSess(id) {
    const s = sessions.find(x => x.id === id);
    saveSessions(sessions.filter(s => s.id !== id));
    if (s) logAction("session", `Deleted session: ${s.date} ${s.from}–${s.to}${s.label ? " «" + s.label + "»" : ""} (${s.players?.length || 0} players)`);
    setView("schedule"); setSelSess(null);
    showToast("Session deleted");
  }

  function openWA(date) {
    const msg = waMsg(sessions, date);
    if (!msg) { showToast("No sessions for that date"); return; }
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  // ── Members ───────────────────────────────────────────────────
  function addMember(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    if (members.find(m => m.name.toLowerCase() === newName.trim().toLowerCase())) {
      showToast("Member already exists"); return;
    }
    const teamLabel = newTeam === "Unassigned" ? "no team" : newTeam;
    saveMembers([...members, normMember({
      id: uid(), name: newName.trim(),
      teams: newTeam === "Unassigned" ? [] : [newTeam],
      role: "member",
      email: newEmail.trim() || null,
      phone: newPhone.trim() || null,
    })]);
    logAction("member", `Added member: ${newName.trim()} (${teamLabel})${newEmail ? " · " + newEmail : ""}`);
    setNewName(""); setNewEmail(""); setNewPhone("");
    showToast("Member added ✓");
  }

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [schedFilter, setSchedFilter] = useState("all"); // "all" | "mine"
  const [blocksExpanded, setBlocksExpanded] = useState(false);
  const [showPastAll, setShowPastAll] = useState(false);
  const [showUpcomingAll, setShowUpcomingAll] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(() => {
    try { return localStorage.getItem("fcc-welcome-v1") === "1"; } catch { return false; }
  });
  const [showAllBlocks, setShowAllBlocks] = useState(false);
  const [xlsParsed, setXlsParsed] = useState(null);  // {fixtures, allMatches} from uploaded DCF xlsx
  const [xlsError, setXlsError] = useState(null);
  // Availability / absence state
  const [absFrom, setAbsFrom] = useState("");
  const [absTo, setAbsTo] = useState("");
  const [absCat, setAbsCat] = useState("Holiday");
  const [absNote, setAbsNote] = useState("");
  const [absConflicts, setAbsConflicts] = useState(null);
  const [avTeam, setAvTeam] = useState("");   // team availability view selection
  const [showMatches, setShowMatches] = useState(true); // match overlay toggle
  const [netsDate, setNetsDate] = useState(todayStr());
  const [wxData, setWxData] = useState(null); // weather data
  const [blockCals, setBlockCals] = useState([]);    // [{id,date,from,to,label}]
  const [bCalDate, setBCalDate] = useState("");
  const [bCalFrom, setBCalFrom] = useState("10:00");
  const [bCalTo, setBCalTo] = useState("14:00");
  const [bCalLabel, setBCalLabel] = useState("");
  const [showBlockForm, setShowBlockForm] = useState(false); // member object to confirm delete
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileEditing, setProfileEditing] = useState(false);
  const [changingPin, setChangingPin] = useState(false);
  const [oldPin, setOldPin] = useState("");
  const [newPin1, setNewPin1] = useState("");
  const [newPin2, setNewPin2] = useState("");
  const [pinMsg, setPinMsg] = useState("");

  function removeMember(id) {
    const m = members.find(x => x.id === id);
    saveMembers(members.filter(m => m.id !== id));
    if (m) logAction("member", `Deleted member: ${m.name} (was ${m.role || "member"}${m.teams?.length ? ", teams: " + m.teams.join(", ") : ""})`);
    setConfirmDelete(null);
    showToast("Member removed");
  }

  function renameMember(id, newName) {
    const trimmed = newName.trim();
    if (!trimmed) { setEditingName(null); return; }
    const old = members.find(m => m.id === id)?.name;
    if (!old || trimmed === old) { setEditingName(null); return; }
    if (members.find(m => m.id !== id && m.name.toLowerCase() === trimmed.toLowerCase())) {
      showToast("Another member already has that name"); return;
    }
    // Update member name
    saveMembers(members.map(m => m.id === id ? { ...m, name: trimmed } : m));
    logAction("member", `Renamed member: "${old}" → "${trimmed}"`);
    // Update all sessions that reference the old name
    const updSess = sessions.map(s => ({
      ...s,
      players: s.players.map(p => p === old ? trimmed : p),
      poll: (s.poll || []).map(o => ({
        ...o, votes: (o.votes || []).map(v => v === old ? trimmed : v)
      })),
    }));
    saveSessions(updSess);
    setEditingName(null);
    showToast(`Renamed to "${trimmed}" ✓`);
  }

  function fixAllNames() {
    // Only fix members whose entire name is a single word AND it exists in NAME_MAP
    let renames = []; // [{old, new}]
    const newMembers = members.map(m => {
      const isSingleWord = !m.name.includes(" ");
      const mapped = NAME_MAP[m.name];
      if (isSingleWord && mapped && mapped !== m.name) {
        renames.push({ old: m.name, new: mapped });
        return { ...m, name: mapped };
      }
      return m;
    });
    if (renames.length === 0) { showToast("All names already look complete ✓"); return; }
    // Apply renames to sessions (players + poll votes)
    const rMap = Object.fromEntries(renames.map(r => [r.old, r.new]));
    const newSessions = sessions.map(s => ({
      ...s,
      players: s.players.map(p => rMap[p] || p),
      poll: (s.poll || []).map(o => ({
        ...o, votes: (o.votes || []).map(v => rMap[v] || v),
      })),
    }));
    saveMembers(newMembers);
    saveSessions(newSessions);
    logAction("system", `Auto-fixed ${renames.length} name${renames.length > 1 ? "s" : ""}: ${renames.map(r => `"${r.old}"→"${r.new}"`).join(", ")}`);
    showToast(`Fixed ${renames.length} name${renames.length > 1 ? "s" : ""} ✓`);
  }

  function toggleMemberTeam(id, teamName) {
    const mem = members.find(m => m.id === id);
    if (!mem) return;
    const current = mem.teams || [];
    const next = current.includes(teamName)
      ? current.filter(t => t !== teamName)
      : [...current, teamName];
    // If no senior team remains and role is captain/VC, demote
    const hasSenior = next.some(t => seniorTeamNames.includes(t));
    const newRole = (!hasSenior && ["captain", "vicecaptain"].includes(mem.role))
      ? "member" : mem.role;
    const action = current.includes(teamName) ? "Removed" : "Added";
    logAction("team", `${action} ${mem.name} ${action === "Added" ? "to" : "from"} ${teamName}${newRole !== mem.role ? ` (demoted to member — no senior team)` : ""}`);
    saveMembers(members.map(m => m.id === id ? { ...m, teams: next, role: newRole } : m));
  }

  function updateRole(id, role) {
    const mem = members.find(m => m.id === id);
    const hasSenior = (mem?.teams || []).some(t => seniorTeamNames.includes(t));
    if (["captain", "vicecaptain"].includes(role) && !hasSenior) {
      showToast("Captain/VC only available for Senior team members"); return;
    }
    logAction("role", `Changed role: ${mem?.name} → ${role} (was ${mem?.role || "member"})`);
    saveMembers(members.map(m => m.id === id ? { ...m, role } : m));
    setEditingRole(null);
    showToast("Role updated ✓");
  }

  function saveProfile(confirmed = false) {
    const now = new Date().toISOString();
    const updated = members.map(m => m.id === currentUser.id
      ? {
        ...m,
        email: profileEmail.trim(),
        phone: profilePhone.trim(),
        profileConfirmedAt: confirmed ? now : (m.profileConfirmedAt || null),
      } : m);
    saveMembers(updated);
    const fresh = updated.find(m => m.id === currentUser.id);
    setCurrentUser(fresh);
    localStorage.setItem("fcc-current-user", JSON.stringify(fresh));
    setProfileEditing(false);
    showToast(confirmed ? "Profile confirmed ✓" : "Profile saved ✓");
  }

  function confirmProfile() {
    // Save current details + stamp confirmed date
    setProfileEmail(members.find(m => m.id === currentUser.id)?.email || "");
    setProfilePhone(members.find(m => m.id === currentUser.id)?.phone || "");
    saveProfile(true);
  }

  function handleChangePin() {
    if (!oldPin || !newPin1 || !newPin2) { setPinMsg("Fill in all fields"); return; }
    if (hashPin(oldPin) !== pins[currentUser.id]) { setPinMsg("Current PIN is incorrect"); return; }
    if (newPin1.length !== 4 || !/^\d+$/.test(newPin1)) { setPinMsg("New PIN must be 4 digits"); return; }
    if (newPin1 !== newPin2) { setPinMsg("New PINs don't match"); return; }
    savePins({ ...pins, [currentUser.id]: hashPin(newPin1) });
    setChangingPin(false); setOldPin(""); setNewPin1(""); setNewPin2(""); setPinMsg("");
    showToast("PIN changed ✓");
  }

  function resetPin(id) {
    const m = members.find(x => x.id === id);
    const updated = { ...pins }; delete updated[id];
    savePins(updated);
    if (m) logAction("pin", `Reset PIN for: ${m.name}`);
    showToast("PIN cleared — member sets new PIN on next login");
  }

  // ── Computed ──────────────────────────────────────────────────
  const upcoming = [...sessions].filter(s => isFuture(s.date))
    .sort((a, b) => new Date(a.date) - new Date(b.date) || a.from.localeCompare(b.from));
  const past = [...sessions].filter(s => !isFuture(s.date))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const tomorrowSess = sessions.filter(s => s.date === tomorrowStr() && isFuture(s.date));
  const todaySess = sessions.filter(s => s.date === todayStr() && isFuture(s.date));

  // Player picker — member appears under EACH of their teams
  const pickVisible = members.filter(m =>
    !pSearch || m.name.toLowerCase().includes(pSearch.toLowerCase())
  );
  const myTeamsList = currentUser ? (members.find(m => m.id === currentUser.id)?.teams || []) : [];
  // Build pickGrouped with user's teams first, then others
  const pickGrouped = (() => {
    const obj = ALL_TEAMS.reduce((acc, t) => {
      if (pFilter !== "All" && pFilter !== t) return acc;
      const list = pickVisible.filter(m =>
        t === "Unassigned"
          ? (m.teams || []).length === 0
          : (m.teams || []).includes(t)
      );
      if (list.length) acc[t] = list;
      return acc;
    }, {});
    // Sort keys: user's teams first, then alphabetical
    const sorted = Object.keys(obj).sort((a, b) => {
      const aIsMine = myTeamsList.includes(a);
      const bIsMine = myTeamsList.includes(b);
      if (aIsMine && !bIsMine) return -1;
      if (!aIsMine && bIsMine) return 1;
      return a.localeCompare(b);
    });
    return sorted.reduce((acc, k) => { acc[k] = obj[k]; return acc; }, {});
  })();

  // Admin list — member shown under EACH team (or Unassigned if none)
  const adminVisible = members.filter(m => {
    const q = !aSearch || m.name.toLowerCase().includes(aSearch.toLowerCase());
    const t = aFilter === "All"
      || (aFilter === "Unassigned" && (m.teams || []).length === 0)
      || (m.teams || []).includes(aFilter);
    return q && t;
  });
  const adminGrouped = ALL_TEAMS.reduce((acc, t) => {
    if (aFilter !== "All" && aFilter !== t) return acc;
    const list = adminVisible.filter(m =>
      t === "Unassigned"
        ? (m.teams || []).length === 0
        : (m.teams || []).includes(t)
    );
    if (list.length) acc[t] = list;
    return acc;
  }, {});

  // ════════════════════════════════════════════════════════════
  // RENDER: Loading
  // ════════════════════════════════════════════════════════════
  if (loading) return (
    <Shell>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", color: G.mid }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏏</div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Loading FCC Training…</div>
        </div>
      </div>
    </Shell>
  );

  // ════════════════════════════════════════════════════════════
  // RENDER: Auth — pick member
  // ════════════════════════════════════════════════════════════
  if (!currentUser && authView === "pick") {
    const filtered = pickSearch.trim().length >= 1
      ? members.filter(m => m.name.toLowerCase().includes(pickSearch.toLowerCase()))
      : [];
    const hasQuery = pickSearch.trim().length >= 1;

    return (
      <Shell>
        {/* Header */}
        <div style={{ background: G.green, padding: "36px 24px 32px", textAlign: "center" }}>
          <img src={FCC_LOGO} alt="FCC" style={{
            width: 88, height: 88, borderRadius: "50%",
            objectFit: "cover", margin: "0 auto 14px", display: "block",
            border: "3px solid rgba(255,255,255,0.25)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
          }} />
          <div style={{
            color: G.white, fontFamily: "'Playfair Display',serif",
            fontSize: 28, fontWeight: 900, letterSpacing: "-.5px", lineHeight: 1
          }}>FCC Training</div>
          <div style={{
            color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 700,
            letterSpacing: 2.5, textTransform: "uppercase", marginTop: 5
          }}>Fredensborg CC</div>
        </div>

        <div style={{ padding: "24px 20px 40px" }}>
          {/* Prompt text */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: G.text }}>Enter your name to find your profile and log in</div>
            <div style={{ fontSize: 12, color: G.muted, marginTop: 4 }}>
              Not listed? Ask an admin to add you.
            </div>
          </div>

          {/* Search input */}
          <div style={{ position: "relative", marginBottom: 16 }}>
            <span style={{
              position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
              fontSize: 18, pointerEvents: "none"
            }}>🔍</span>
            <input
              style={{
                ...iSt({
                  background: G.white, paddingLeft: 44, fontSize: 16,
                  borderRadius: 14, padding: "14px 14px 14px 44px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.07)"
                }),
              }}
              placeholder="Start typing your name…"
              value={pickSearch}
              onChange={e => setPickSearch(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </div>

          {/* Results as chips */}
          {hasQuery && filtered.length > 0 && (
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 9, justifyContent: "center",
              marginTop: 8
            }}>
              {filtered.map(m => {
                const tm = m.team ? getTeamMeta(m.team) : null;
                return (
                  <button key={m.id} onClick={() => handlePickMember(m)}
                    style={{
                      background: tm ? tm.bg : G.green,
                      color: tm ? tm.text : G.lime,
                      border: "none", borderRadius: 30,
                      padding: "10px 18px",
                      fontFamily: "inherit", fontWeight: 800, fontSize: 14,
                      cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 7,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                      transition: "transform .1s, box-shadow .1s",
                    }}
                    onMouseDown={e => e.currentTarget.style.transform = "scale(0.96)"}
                    onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
                  >
                    <span style={{
                      width: 24, height: 24, borderRadius: "50%",
                      background: "rgba(255,255,255,0.2)", display: "inline-flex",
                      alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 900, flexShrink: 0
                    }}>
                      {m.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                    </span>
                    {m.name}
                    {m.role && m.role !== "member" && (
                      <span style={{ fontSize: 12 }}>{ROLE_META[m.role]?.icon}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* No results — offer Request to Join */}
          {hasQuery && filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "24px 0 8px" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🤔</div>
              <div style={{ fontWeight: 800, color: G.text, fontSize: 15 }}>Not found</div>
              <div style={{ fontSize: 13, color: G.muted, marginTop: 4, marginBottom: 18, lineHeight: 1.6 }}>
                Not in the app yet? Submit a request<br />and an admin will add you.
              </div>
              <button onClick={() => {
                setJrName(pickSearch.trim());
                setJrTeam(""); setJrContact(""); setJrPhone(""); setJrForChild(false);
                setJrChildName(""); setJrChildTeam("");
                setAuthView("joinrequest");
              }}
                style={{
                  background: G.green, color: G.lime, border: "none", borderRadius: 12,
                  padding: "12px 24px", fontFamily: "inherit", fontWeight: 800, fontSize: 14,
                  cursor: "pointer", boxShadow: "0 3px 12px rgba(20,83,45,.3)"
                }}>
                ✋ Request to Join
              </button>
            </div>
          )}

          {/* Idle hint */}
          {!hasQuery && (
            <div style={{ textAlign: "center", padding: "20px 0 0" }}>
              <div style={{ fontSize: 40, marginBottom: 10, opacity: .4 }}>🏏</div>
              <div style={{ fontSize: 13, color: G.muted, lineHeight: 1.7 }}>
                {members.length} members registered<br />
                <span style={{ fontWeight: 700, color: G.text }}>Start typing</span> to find your name
              </div>
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${G.border}` }}>
                <div style={{ fontSize: 12, color: G.muted, marginBottom: 10 }}>
                  First time? Setting up your account?
                </div>
                <button onClick={() => { setVfStep("search"); setVfSearch(""); setVfMatch(null); setVfEmail(""); setVfPhone(""); setVfCode(""); setVfError(""); setVfConsent(false); setVfIsParent(false); setAuthView("verify"); }}
                  style={{
                    background: G.white, color: G.green, border: `1.5px solid ${G.green}`,
                    borderRadius: 20, padding: "9px 22px", fontSize: 13, fontWeight: 800,
                    cursor: "pointer", fontFamily: "inherit"
                  }}>
                  ✅ Verify / Set up my account
                </button>
              </div>
            </div>
          )}
        </div>
      </Shell>
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: Auth — Request to Join
  // ════════════════════════════════════════════════════════════
  if (!currentUser && authView === "joinrequest") {
    const nonPlayerOption = "I don't play / I'm a parent";
    const teamOptions = [...ALL_TEAMS.filter(t => t !== "Unassigned"), nonPlayerOption];

    function submitJoinRequest() {
      const nameToCheck = jrForChild ? jrChildName.trim() : jrName.trim();
      if (!nameToCheck) { showToast("Please enter a name"); return; }
      const teamVal = jrForChild ? jrChildTeam : jrTeam;
      const req = {
        id: uid(),
        submittedAt: new Date().toISOString(),
        forChild: jrForChild,
        playerName: jrForChild ? jrChildName.trim() : jrName.trim(),
        playerTeam: teamVal === "unsure" ? null : (teamVal || null),
        parentName: jrForChild ? jrName.trim() : null,
        email: jrContact.trim() || null,      // stored as email not contact
        contact: jrPhone.trim() || null,       // phone in contact
        status: "pending",
      };
      saveJoinRequests([...joinRequests, req]);
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "joinrequest",
          data: {
            name: req.playerName,
            playerTeam: req.playerTeam || "Not sure yet",
            message: req.parentName
              ? `Parent: ${req.parentName}${req.email ? " · " + req.email : ""}${req.contact ? " · " + req.contact : ""}`
              : `${req.email || ""}${req.contact ? " · " + req.contact : ""}`
          }
        })
      }).catch(() => { });
      setAuthView("joinrequestdone");
    }

    return (
      <Shell>
        <div style={{ background: G.green, padding: "20px 20px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 26, marginBottom: 4 }}>✋</div>
          <div style={{
            color: G.white, fontFamily: "'Playfair Display',serif",
            fontSize: 19, fontWeight: 900
          }}>Request to Join</div>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 3 }}>
            An admin will review and add you shortly
          </div>
        </div>

        <div style={{ padding: "20px 20px 100px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Registering for yourself or a child? */}
          <div style={{
            background: "#fff", border: `1.5px solid ${G.border}`, borderRadius: 12,
            padding: "14px 16px"
          }}>
            <div style={{
              fontSize: 11, fontWeight: 900, letterSpacing: 1.5, color: G.muted,
              textTransform: "uppercase", marginBottom: 10
            }}>Who are you registering?</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ v: false, label: "🙋 Myself" }, { v: true, label: "👶 My child" }].map(opt => (
                <button key={String(opt.v)} onClick={() => {
                  if (opt.v && !jrForChild) {
                    // Switching TO child tab — move typed name to child field
                    if (jrName.trim()) { setJrChildName(jrName.trim()); setJrName(""); }
                  } else if (!opt.v && jrForChild) {
                    // Switching BACK to myself — move child name back if parent name empty
                    if (!jrName.trim() && jrChildName.trim()) { setJrName(jrChildName.trim()); setJrChildName(""); }
                  }
                  setJrForChild(opt.v);
                }}
                  style={{
                    flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
                    cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13,
                    background: jrForChild === opt.v ? G.green : G.bg,
                    color: jrForChild === opt.v ? G.lime : G.muted,
                    transition: "all .12s"
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Your name (always shown — either player or parent) */}
          <div style={{
            background: "#fff", border: `1.5px solid ${G.border}`, borderRadius: 12,
            padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10
          }}>
            <FFld label={jrForChild ? "Your Name (Parent / Guardian)" : "Your Full Name"}>
              <input placeholder={jrForChild ? "e.g. Priya Sharma" : "e.g. Arjun Sharma"}
                style={iSt()} value={jrName}
                onChange={e => setJrName(e.target.value)} />
            </FFld>
            {!jrForChild && (
              <FFld label="Your Team / Group">
                <select style={iSt()} value={jrTeam} onChange={e => setJrTeam(e.target.value)}>
                  <option value="">— Select your team —</option>
                  {teamOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </FFld>
            )}
            <FFld label="Your Email">
              <input type="email" placeholder="your@email.com"
                style={iSt()} value={jrContact}
                onChange={e => setJrContact(e.target.value)} />
            </FFld>
            <FFld label="Your Phone (optional)">
              <input type="tel" placeholder="+45 XX XX XX XX"
                style={iSt()} value={jrPhone || ""}
                onChange={e => setJrPhone?.(e.target.value)} />
            </FFld>
          </div>

          {/* Child details — only if registering for child */}
          {jrForChild && (
            <div style={{
              background: "#fdf2f8", border: "1.5px solid #f9a8d4", borderRadius: 12,
              padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10
            }}>
              <div style={{
                fontSize: 11, fontWeight: 900, letterSpacing: 1.5,
                color: "#be185d", textTransform: "uppercase", marginBottom: 2
              }}>
                👶 Child's Details
              </div>
              <FFld label="Child's Full Name">
                <input placeholder="Child's full name"
                  style={iSt()} value={jrChildName}
                  onChange={e => setJrChildName(e.target.value)} />
              </FFld>
              <FFld label="Child's Team / Group">
                <select style={iSt()} value={jrChildTeam} onChange={e => setJrChildTeam(e.target.value)}>
                  <option value="">— Select team —</option>
                  {teamOptions.filter(t => t !== nonPlayerOption).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                  <option value="unsure">I'm not sure</option>
                </select>
              </FFld>
            </div>
          )}

          <button onClick={submitJoinRequest}
            style={{
              background: G.green, color: G.lime, border: "none", borderRadius: 12,
              padding: "15px", fontSize: 15, fontWeight: 800, cursor: "pointer",
              fontFamily: "inherit", boxShadow: "0 3px 14px rgba(20,83,45,.3)"
            }}>
            Submit Request →
          </button>
          <button onClick={() => setAuthView("pick")}
            style={{
              background: "transparent", color: G.muted, border: "none",
              fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", padding: "6px"
            }}>
            ← Back to login
          </button>
        </div>
      </Shell>
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: Auth — Request submitted confirmation
  // ════════════════════════════════════════════════════════════
  // ════════════════════════════════════════════════════════════
  // RENDER: Self-service Verify / Onboarding
  // ════════════════════════════════════════════════════════════
  if (!currentUser && authView === "verify") {
    const ALL_TEAM_OPTS = teams.map(t => t.name);
    const vfFiltered = vfSearch.trim().length >= 2
      ? members.filter(m => m.name.toLowerCase().includes(vfSearch.toLowerCase())).slice(0, 8)
      : [];

    function generateCode() {
      return String(Math.floor(100000 + Math.random() * 900000));
    }

    async function sendCode(email, name) {
      setVfSending(true); setVfError("");
      const code = generateCode();
      try {
        const r = await fetch("/api/send-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, name, code })
        });
        if (!r.ok) throw new Error("Send failed");
        setVfSentCode(code);
        setVfCodeExpiry(Date.now() + 15 * 60 * 1000);
        setVfStep("code");
      } catch (e) {
        setVfError("Could not send email. Please check the address and try again.");
      }
      setVfSending(false);
    }

    function verifyCode() {
      if (!vfSentCode) { setVfError("No code sent yet"); return; }
      if (Date.now() > vfCodeExpiry) { setVfError("Code expired — please request a new one"); return; }
      if (vfCode.trim() !== vfSentCode) { setVfError("Incorrect code — please try again"); return; }
      // Code correct — activate account
      if (vfMatch) {
        // Update existing member with email/phone + consent
        const updated = members.map(m => m.id === vfMatch.id ? {
          ...m,
          email: vfEmail.trim() || m.email,
          phone: vfPhone.trim() || m.phone,
          emailVerified: true,
          consentGiven: true,
          consentDate: new Date().toISOString().slice(0, 10),
        } : m);
        saveMembers(updated);
        // Generate invite code so they can log in now
        generateInviteCode(vfMatch.id);
        logAction("member", `Self-verified email: ${vfMatch.name} — ${vfEmail}`);
        setVfStep("done");
      } else {
        // New person — create join request with verified email
        const req = {
          id: uid(),
          submittedAt: new Date().toISOString(),
          forChild: vfIsParent,
          playerName: vfIsParent ? vfChildName.trim() : vfNewName.trim(),
          playerTeam: vfNewTeam || null,
          parentName: vfIsParent ? vfNewName.trim() : null,
          contact: vfPhone.trim() || null,
          email: vfEmail.trim(),
          emailVerified: true,
          consentGiven: vfConsent,
          consentDate: new Date().toISOString().slice(0, 10),
          status: "pending",
        };
        saveJoinRequests([...joinRequests, req]);
        fetch("/api/notify", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "joinrequest", data: {
              name: req.playerName, playerTeam: req.playerTeam,
              message: `Email verified: ${vfEmail}${req.parentName ? " · Parent: " + req.parentName : ""}`
            }
          })
        }).catch(() => { });
        setVfStep("done");
      }
    }

    const hdr = (title, sub) => (
      <div style={{ background: G.green, padding: "20px 20px 16px", textAlign: "center" }}>
        <div style={{
          color: G.white, fontFamily: "'Playfair Display',serif",
          fontSize: 18, fontWeight: 900
        }}>{title}</div>
        {sub && <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 3 }}>{sub}</div>}
      </div>
    );

    // ── Step: done ────────────────────────────────────────────
    if (vfStep === "done") return (
      <Shell>
        {hdr("All done! 🎉", "FCC Training")}
        <div style={{ padding: "32px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          {vfMatch ? (<>
            <div style={{
              fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 900,
              color: G.green, marginBottom: 10
            }}>Account activated!</div>
            <div style={{ fontSize: 14, color: G.muted, lineHeight: 1.6, marginBottom: 24 }}>
              Your email has been verified and your account is now set up.
              Go back to the login screen and tap your name to log in.
            </div>
          </>) : (<>
            <div style={{
              fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 900,
              color: G.green, marginBottom: 10
            }}>Request submitted!</div>
            <div style={{ fontSize: 14, color: G.muted, lineHeight: 1.6, marginBottom: 24 }}>
              Your email is verified. The admin will review your request and
              you'll be added to the app shortly.
            </div>
          </>)}
          <button onClick={() => { setAuthView("pick"); setVfStep("search"); }}
            style={{
              background: G.green, color: G.lime, border: "none", borderRadius: 12,
              padding: "12px 28px", fontSize: 14, fontWeight: 800, cursor: "pointer",
              fontFamily: "inherit"
            }}>
            ← Back to login
          </button>
        </div>
      </Shell>
    );

    // ── Step: code verification ───────────────────────────────
    if (vfStep === "code") return (
      <Shell>
        {hdr("Check your email", "Enter the 6-digit code we sent you")}
        <div style={{ padding: "24px 20px 40px" }}>
          <div style={{
            background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 12,
            padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#166534"
          }}>
            📧 Code sent to <b>{vfEmail}</b>. Check your inbox (and spam folder).
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: G.muted, display: "block", marginBottom: 6 }}>
              ENTER 6-DIGIT CODE
            </label>
            <input value={vfCode} onChange={e => setVfCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric" maxLength={6} placeholder="123456"
              style={{
                ...iSt({
                  fontSize: 24, textAlign: "center", letterSpacing: 6, fontWeight: 900,
                  padding: "14px", borderRadius: 12
                })
              }} />
          </div>
          {vfError && <div style={{
            background: G.redBg, color: G.red, borderRadius: 8,
            padding: "8px 12px", fontSize: 13, marginBottom: 12
          }}>{vfError}</div>}
          <Btn bg={G.green} col={G.lime} full
            onClick={verifyCode} disabled={vfCode.length !== 6}>
            ✓ Verify Code
          </Btn>
          <button onClick={() => sendCode(vfEmail, vfMatch?.name || vfNewName)}
            style={{
              width: "100%", marginTop: 10, background: "none", border: `1px solid ${G.border}`,
              borderRadius: 10, padding: "10px", fontSize: 13, fontWeight: 700, color: G.muted,
              cursor: "pointer", fontFamily: "inherit"
            }}>
            {vfSending ? "Sending…" : "Resend code"}
          </button>
          <button onClick={() => setVfStep(vfMatch ? "found" : "notfound")}
            style={{
              width: "100%", marginTop: 8, background: "none", border: "none",
              fontSize: 12, color: G.muted, cursor: "pointer", fontFamily: "inherit"
            }}>
            ← Back
          </button>
        </div>
      </Shell>
    );

    // ── Step: found — existing member ─────────────────────────
    if (vfStep === "found" && vfMatch) {
      const hasEmail = !!(vfMatch.email || "").trim();
      return (
        <Shell>
          {hdr(`Hi, ${vfMatch.name.split(" ")[0]}!`, "FCC Training — account setup")}
          <div style={{ padding: "20px 20px 40px" }}>
            {/* Privacy notice */}
            <div style={{
              background: G.cream, border: `1px solid ${G.border}`, borderRadius: 10,
              padding: "12px 14px", marginBottom: 16, fontSize: 11, color: G.muted, lineHeight: 1.6
            }}>
              <b style={{ color: G.text }}>🔐 Privacy notice</b><br />{PRIVACY_TEXT}
            </div>

            {hasEmail ? (<>
              <div style={{
                background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10,
                padding: "12px 14px", marginBottom: 16
              }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: "#166534", marginBottom: 4 }}>
                  ✅ We have an email on file
                </div>
                <div style={{ fontSize: 13, color: G.muted }}>
                  {vfMatch.email.replace(/(.{2})(.*)(@.*)/, (m, a, b, c) => a + "•".repeat(b.length) + c)}
                </div>
              </div>
              <div style={{ fontSize: 13, color: G.muted, marginBottom: 16, lineHeight: 1.6 }}>
                Is this the correct email? We'll send a verification code to confirm.
              </div>
              <Btn bg={G.green} col={G.lime} full disabled={vfSending}
                onClick={() => { setVfEmail(vfMatch.email); sendCode(vfMatch.email, vfMatch.name); }}>
                {vfSending ? "Sending…" : "📧 Send verification code"}
              </Btn>
              <button onClick={() => { setVfStep("search"); }}
                style={{
                  width: "100%", marginTop: 10, background: "none", border: `1px solid ${G.border}`,
                  borderRadius: 10, padding: "10px", fontSize: 13, fontWeight: 700, color: G.muted,
                  cursor: "pointer", fontFamily: "inherit"
                }}>
                Not me / use a different email
              </button>
            </>) : (<>
              <div style={{ fontSize: 14, color: G.text, fontWeight: 700, marginBottom: 16 }}>
                We found your profile but don't have your email yet.
                Add it below to activate your account.
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: G.muted, display: "block", marginBottom: 5 }}>
                  YOUR EMAIL ADDRESS
                </label>
                <input type="email" value={vfEmail} onChange={e => setVfEmail(e.target.value)}
                  placeholder="your@email.com"
                  style={iSt({ fontSize: 15, padding: "12px 14px", borderRadius: 10 })} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: G.muted, display: "block", marginBottom: 5 }}>
                  PHONE NUMBER <span style={{ fontWeight: 400 }}>(optional)</span>
                </label>
                <input type="tel" value={vfPhone} onChange={e => setVfPhone(e.target.value)}
                  placeholder="+45 XX XX XX XX"
                  style={iSt({ fontSize: 15, padding: "12px 14px", borderRadius: 10 })} />
              </div>
              {vfError && <div style={{
                background: G.redBg, color: G.red, borderRadius: 8,
                padding: "8px 12px", fontSize: 13, marginBottom: 12
              }}>{vfError}</div>}
              <Btn bg={G.green} col={G.lime} full disabled={!vfEmail.includes("@") || vfSending}
                onClick={() => sendCode(vfEmail, vfMatch.name)}>
                {vfSending ? "Sending…" : "📧 Send verification code"}
              </Btn>
            </>)}
            <button onClick={() => setVfStep("search")}
              style={{
                width: "100%", marginTop: 8, background: "none", border: "none",
                fontSize: 12, color: G.muted, cursor: "pointer", fontFamily: "inherit"
              }}>
              ← Back to search
            </button>
          </div>
        </Shell>
      );
    }

    // ── Step: notfound — new member/parent ────────────────────
    if (vfStep === "notfound") return (
      <Shell>
        {hdr("Join Fredensborg CC", "Set up your account")}
        <div style={{ padding: "20px 20px 40px" }}>
          {/* Privacy notice */}
          <div style={{
            background: G.cream, border: `1px solid ${G.border}`, borderRadius: 10,
            padding: "12px 14px", marginBottom: 16, fontSize: 11, color: G.muted, lineHeight: 1.6
          }}>
            <b style={{ color: G.text }}>🔐 Privacy notice</b><br />{PRIVACY_TEXT}
          </div>

          {/* Parent toggle */}
          <label style={{
            display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
            cursor: "pointer", padding: "10px 12px", background: G.cream, borderRadius: 10,
            border: `1px solid ${G.border}`
          }}>
            <input type="checkbox" checked={vfIsParent}
              onChange={e => setVfIsParent(e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: G.text }}>
              I'm a parent registering on behalf of my child
            </span>
          </label>

          {vfIsParent && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: G.muted, display: "block", marginBottom: 5 }}>
                CHILD'S NAME
              </label>
              <input value={vfChildName} onChange={e => setVfChildName(e.target.value)}
                placeholder="Child's full name"
                style={iSt({ fontSize: 15, padding: "12px 14px", borderRadius: 10 })} />
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: G.muted, display: "block", marginBottom: 5 }}>
              {vfIsParent ? "YOUR NAME (parent/guardian)" : "YOUR FULL NAME"}
            </label>
            <input value={vfNewName} onChange={e => setVfNewName(e.target.value)}
              placeholder="Full name"
              style={iSt({ fontSize: 15, padding: "12px 14px", borderRadius: 10 })} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: G.muted, display: "block", marginBottom: 5 }}>
              TEAM / GROUP
            </label>
            <select value={vfNewTeam} onChange={e => setVfNewTeam(e.target.value)}
              style={iSt({ fontSize: 14, padding: "12px 14px", borderRadius: 10 })}>
              <option value="">Select a group…</option>
              {ALL_TEAM_OPTS.map(t => <option key={t} value={t}>{t}</option>)}
              <option value="unsure">Not sure</option>
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: G.muted, display: "block", marginBottom: 5 }}>
              EMAIL ADDRESS
            </label>
            <input type="email" value={vfEmail} onChange={e => setVfEmail(e.target.value)}
              placeholder="your@email.com"
              style={iSt({ fontSize: 15, padding: "12px 14px", borderRadius: 10 })} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: G.muted, display: "block", marginBottom: 5 }}>
              PHONE <span style={{ fontWeight: 400 }}>(optional)</span>
            </label>
            <input type="tel" value={vfPhone} onChange={e => setVfPhone(e.target.value)}
              placeholder="+45 XX XX XX XX"
              style={iSt({ fontSize: 15, padding: "12px 14px", borderRadius: 10 })} />
          </div>

          {/* Consent */}
          <label style={{
            display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16,
            cursor: "pointer", padding: "12px 14px", background: "#fffbeb", borderRadius: 10,
            border: "1px solid #fde68a"
          }}>
            <input type="checkbox" checked={vfConsent}
              onChange={e => setVfConsent(e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer", flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 12, color: "#78350f", lineHeight: 1.6 }}>
              I consent to Fredensborg Cricket Club storing my {vfIsParent ? "child's" : ""}  personal data
              (name, email, phone) for the purpose of managing club membership and communications,
              as described in the privacy notice above.
              {vfIsParent && " I confirm I have parental authority to provide this consent."}
            </span>
          </label>

          {vfError && <div style={{
            background: G.redBg, color: G.red, borderRadius: 8,
            padding: "8px 12px", fontSize: 13, marginBottom: 12
          }}>{vfError}</div>}

          <Btn bg={G.green} col={G.lime} full
            disabled={!vfConsent || !vfEmail.includes("@") || (vfIsParent ? !vfChildName.trim() : !vfNewName.trim()) || vfSending}
            onClick={() => sendCode(vfEmail, vfNewName || "Member")}>
            {vfSending ? "Sending code…" : "📧 Verify email & submit"}
          </Btn>
          <button onClick={() => setVfStep("search")}
            style={{
              width: "100%", marginTop: 8, background: "none", border: "none",
              fontSize: 12, color: G.muted, cursor: "pointer", fontFamily: "inherit"
            }}>
            ← Back to search
          </button>
        </div>
      </Shell>
    );

    // ── Step: search ──────────────────────────────────────────
    return (
      <Shell>
        {hdr("Set up your account", "Fredensborg Cricket Club")}
        <div style={{ padding: "20px 20px 40px" }}>
          <div style={{ fontSize: 14, color: G.muted, marginBottom: 20, lineHeight: 1.6 }}>
            First, let's find your profile. Type your name (or your child's name if you're a parent).
          </div>
          <div style={{ position: "relative", marginBottom: 16 }}>
            <span style={{
              position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
              fontSize: 16, pointerEvents: "none"
            }}>🔍</span>
            <input value={vfSearch} onChange={e => setVfSearch(e.target.value)}
              placeholder="Start typing a name…"
              autoFocus
              style={{ ...iSt({ paddingLeft: 44, fontSize: 15, borderRadius: 12, padding: "13px 14px 13px 44px" }) }} />
          </div>
          {vfFiltered.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
              {vfFiltered.map(m => (
                <button key={m.id} onClick={() => {
                  setVfMatch(m);
                  setVfEmail(m.email || "");
                  setVfPhone(m.phone || "");
                  setVfStep("found");
                }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: G.white, border: `1.5px solid ${G.border}`, borderRadius: 10,
                    padding: "11px 14px", cursor: "pointer", fontFamily: "inherit",
                    textAlign: "left", transition: "border-color .12s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = G.green}
                  onMouseLeave={e => e.currentTarget.style.borderColor = G.border}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", background: `${G.green}18`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 900, color: G.green, flexShrink: 0
                  }}>
                    {m.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: G.text }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: G.muted }}>
                      {(m.teams || []).join(", ") || "No team assigned"}
                      {m.email ? " · ✉️ email on file" : " · no email yet"}
                    </div>
                  </div>
                  <span style={{ marginLeft: "auto", fontSize: 16, color: G.green }}>›</span>
                </button>
              ))}
            </div>
          )}
          {vfSearch.trim().length >= 2 && vfFiltered.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 13, color: G.muted, marginBottom: 16 }}>
                Not found — you may not be in the system yet.
              </div>
              <button onClick={() => { setVfNewName(vfSearch.trim()); setVfStep("notfound"); }}
                style={{
                  background: G.green, color: G.lime, border: "none", borderRadius: 12,
                  padding: "11px 24px", fontSize: 13, fontWeight: 800, cursor: "pointer",
                  fontFamily: "inherit"
                }}>
                ✋ Register as a new member
              </button>
            </div>
          )}
          <div style={{
            marginTop: 24, paddingTop: 16, borderTop: `1px solid ${G.border}`,
            textAlign: "center"
          }}>
            <button onClick={() => { setVfStep("notfound"); setVfNewName(""); }}
              style={{
                fontSize: 12, color: G.muted, background: "none", border: "none",
                cursor: "pointer", fontFamily: "inherit", textDecoration: "underline"
              }}>
              I'm a new member / parent — register here
            </button>
          </div>
          <button onClick={() => setAuthView("pick")}
            style={{
              width: "100%", marginTop: 10, background: "none", border: `1px solid ${G.border}`,
              borderRadius: 10, padding: "10px", fontSize: 13, fontWeight: 700, color: G.muted,
              cursor: "pointer", fontFamily: "inherit"
            }}>
            ← Back to login
          </button>
        </div>
      </Shell>
    );
  }

  if (!currentUser && authView === "joinrequestdone") return (
    <Shell>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "100vh", padding: "40px 28px", textAlign: "center"
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <div style={{
          fontFamily: "'Playfair Display',serif", fontWeight: 900,
          fontSize: 22, color: G.text, marginBottom: 10
        }}>Request Sent!</div>
        <div style={{ fontSize: 14, color: G.muted, lineHeight: 1.7, marginBottom: 30 }}>
          An admin will review your request and add you to the app.
          You'll be able to log in as soon as it's approved.<br /><br />
          This usually happens within a day or two. 🏏
        </div>
        <button onClick={() => setAuthView("pick")}
          style={{
            background: G.green, color: G.lime, border: "none", borderRadius: 12,
            padding: "14px 32px", fontFamily: "inherit", fontWeight: 800, fontSize: 15,
            cursor: "pointer"
          }}>
          Back to Login
        </button>
      </div>
    </Shell>
  );

  // ════════════════════════════════════════════════════════════
  // RENDER: Auth — verify email (first-time, adults only)
  // ════════════════════════════════════════════════════════════
  if (!currentUser && authView === "verifyemail") {
    const maskedEmail = (() => {
      const e = EMAIL_SEED[pendingMember?.name || ""] || (pendingMember?.email || "");
      if (!e) return null;
      const [local, domain] = e.split("@");
      const shown = local.slice(0, 2) + "•".repeat(Math.max(local.length - 2, 2));
      return shown + "@" + domain;
    })();
    return (
      <Shell>
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
          <div style={{ background: G.green, padding: "22px 20px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🔐</div>
            <div style={{
              color: G.white, fontFamily: "'Playfair Display',serif",
              fontSize: 19, fontWeight: 900
            }}>Hi, {pendingMember?.name.split(" ")[0]}!</div>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 4 }}>
              Verify your email to set up your account
            </div>
          </div>
          <div style={{ flex: 1, padding: "28px 24px" }}>
            <div style={{
              background: "#f0fdf4", border: "1.5px solid rgba(20,83,45,.15)",
              borderRadius: 14, padding: "16px 18px", marginBottom: 20
            }}>
              <div style={{ fontSize: 13, color: G.muted, lineHeight: 1.6 }}>
                We have an email address on record for you ending in{" "}
                <span style={{ fontWeight: 800, color: G.text }}>{maskedEmail}</span>.
                <br />Enter your full email address below to verify your identity.
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{
                display: "block", fontSize: 11, fontWeight: 800,
                color: G.muted, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6
              }}>
                Your Email Address
              </label>
              <input
                type="email" autoFocus autoCapitalize="none"
                placeholder="your@email.com"
                value={emailInput}
                onChange={e => { setEmailInput(e.target.value); setEmailError(""); }}
                onKeyDown={e => e.key === "Enter" && handleVerifyEmail()}
                style={{
                  width: "100%", borderRadius: 10, border: `1.5px solid ${emailError ? "#ef4444" : G.border}`,
                  padding: "13px 14px", fontSize: 15, fontFamily: "'DM Sans',sans-serif",
                  fontWeight: 500, background: "#fff", color: G.text, outline: "none",
                  boxSizing: "border-box"
                }} />
              {emailError && (
                <div style={{ marginTop: 6, fontSize: 12, color: "#dc2626", fontWeight: 700 }}>
                  ⚠️ {emailError}
                </div>
              )}
            </div>
            <button onClick={handleVerifyEmail}
              style={{
                width: "100%", background: G.green, color: G.lime, border: "none",
                borderRadius: 12, padding: "15px", fontSize: 15, fontWeight: 800,
                cursor: "pointer", fontFamily: "inherit", marginBottom: 10
              }}>
              Verify &amp; Continue →
            </button>
            <button onClick={() => { setPendingMember(null); setAuthView("pick"); setEmailInput(""); setEmailError(""); }}
              style={{
                width: "100%", background: "transparent", color: G.muted, border: "none",
                fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", padding: "8px"
              }}>
              ← Back
            </button>
            <div style={{
              marginTop: 20, padding: "12px 14px", background: "#fffbeb",
              border: "1px solid #fde68a", borderRadius: 10, fontSize: 12, color: "#78350f", lineHeight: 1.6
            }}>
              <b>Can't remember?</b> Contact your admin to reset your account.
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: Auth — verify invite code (no email, first-time)
  // ════════════════════════════════════════════════════════════
  if (!currentUser && authView === "verifycode") return (
    <Shell>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <div style={{ background: G.green, padding: "22px 20px 18px", textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🔑</div>
          <div style={{
            color: G.white, fontFamily: "'Playfair Display',serif",
            fontSize: 19, fontWeight: 900
          }}>Hi, {pendingMember?.name.split(" ")[0]}!</div>
          <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 4 }}>
            Enter your invite code to set up your account
          </div>
        </div>
        <div style={{ flex: 1, padding: "28px 24px" }}>
          <div style={{
            background: "#f0fdf4", border: "1.5px solid rgba(20,83,45,.15)",
            borderRadius: 14, padding: "16px 18px", marginBottom: 20
          }}>
            <div style={{ fontSize: 13, color: G.muted, lineHeight: 1.6 }}>
              Your admin has shared a personal <b style={{ color: G.text }}>invite code</b> with you.
              It looks like <b style={{ color: G.text }}>FCC-XXXX</b>.
              Enter it below to verify your identity and set your PIN.
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{
              display: "block", fontSize: 11, fontWeight: 800,
              color: G.muted, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6
            }}>
              Your Invite Code
            </label>
            <input
              type="text" autoFocus autoCapitalize="characters" spellCheck={false}
              placeholder="FCC-XXXX"
              value={emailInput}
              onChange={e => { setEmailInput(e.target.value.toUpperCase()); setEmailError(""); }}
              onKeyDown={e => e.key === "Enter" && handleVerifyCode()}
              style={{
                width: "100%", borderRadius: 10, border: `1.5px solid ${emailError ? "#ef4444" : G.border}`,
                padding: "13px 14px", fontSize: 18, fontFamily: "'DM Sans',sans-serif",
                fontWeight: 700, background: "#fff", color: G.text, outline: "none",
                boxSizing: "border-box", letterSpacing: 3, textAlign: "center"
              }} />
            {emailError && (
              <div style={{ marginTop: 6, fontSize: 12, color: "#dc2626", fontWeight: 700 }}>
                ⚠️ {emailError}
              </div>
            )}
          </div>
          <button onClick={handleVerifyCode}
            style={{
              width: "100%", background: G.green, color: G.lime, border: "none",
              borderRadius: 12, padding: "15px", fontSize: 15, fontWeight: 800,
              cursor: "pointer", fontFamily: "inherit", marginBottom: 10
            }}>
            Verify &amp; Continue →
          </button>
          <button onClick={() => { setPendingMember(null); setAuthView("pick"); setEmailInput(""); setEmailError(""); }}
            style={{
              width: "100%", background: "transparent", color: G.muted, border: "none",
              fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", padding: "8px"
            }}>
            ← Back
          </button>
          <div style={{
            marginTop: 20, padding: "12px 14px", background: "#fffbeb",
            border: "1px solid #fde68a", borderRadius: 10, fontSize: 12, color: "#78350f", lineHeight: 1.6
          }}>
            <b>Don't have a code?</b> Ask your admin to generate one for you — they can do it in the Members panel.
          </div>
        </div>
      </div>
    </Shell>
  );

  // ════════════════════════════════════════════════════════════
  // RENDER: Auth — blocked (no email, no invite code)
  // ════════════════════════════════════════════════════════════
  if (!currentUser && authView === "blocked") return (
    <Shell>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <div style={{ background: G.green, padding: "18px 20px 16px", textAlign: "center" }}>
          <div style={{
            color: G.white, fontFamily: "'Playfair Display',serif",
            fontSize: 19, fontWeight: 900
          }}>Hi, {pendingMember?.name.split(" ")[0]}!</div>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 3 }}>FCC Training</div>
        </div>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 24px"
        }}>
          <div style={{ textAlign: "center", maxWidth: 320 }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🔒</div>
            <div style={{
              fontFamily: "'Playfair Display',serif", fontSize: 20,
              fontWeight: 900, color: G.green, marginBottom: 10
            }}>
              Account not activated yet
            </div>
            <div style={{ fontSize: 14, color: G.muted, lineHeight: 1.6, marginBottom: 20 }}>
              Your profile exists but your account hasn't been set up with an email or access code yet.
            </div>
            <button onClick={() => {
              setVfStep("search");
              setVfSearch(pendingMember?.name || "");
              setVfMatch(pendingMember || null);
              setVfEmail(pendingMember?.email || "");
              setVfPhone(pendingMember?.phone || "");
              setVfCode(""); setVfError(""); setVfConsent(false);
              if (pendingMember) setVfStep("found");
              setAuthView("verify");
            }}
              style={{
                width: "100%", background: G.green, color: G.lime, border: "none",
                borderRadius: 12, padding: "13px 20px", fontSize: 14, fontWeight: 800,
                cursor: "pointer", fontFamily: "inherit", marginBottom: 12
              }}>
              ✅ Set up my account now
            </button>
            <button onClick={() => { setPendingMember(null); setAuthView("pick"); }}
              style={{
                background: "none", color: G.muted, border: `1px solid ${G.border}`,
                borderRadius: 12, padding: "10px 20px", fontSize: 13, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit", width: "100%"
              }}>
              ← Back
            </button>
          </div>
        </div>
      </div>
    </Shell>
  );

  // ════════════════════════════════════════════════════════════
  // RENDER: Auth — set new PIN
  // ════════════════════════════════════════════════════════════
  if (!currentUser && authView === "newpin") return (
    <Shell>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        {/* Compact header at top */}
        <div style={{ background: G.green, padding: "18px 20px 16px", textAlign: "center" }}>
          <div style={{
            color: G.white, fontFamily: "'Playfair Display',serif",
            fontSize: 19, fontWeight: 900
          }}>Hi, {pendingMember?.name.split(" ")[0]}!</div>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 3 }}>
            First time? Set your 4-digit PIN
          </div>
        </div>
        {/* Keypad pushed to lower portion of screen */}
        <div style={{ flex: 1, display: "flex", alignItems: "flex-end", paddingBottom: 60 }}>
          <div style={{ width: "100%" }}>
            <PinPad
              label="Choose a 4-digit PIN"
              onDone={handleNewPin}
              onCancel={() => { setPendingMember(null); setAuthView("pick"); }}
              error={pinError}
            />
          </div>
        </div>
      </div>
    </Shell>
  );

  // ════════════════════════════════════════════════════════════
  // RENDER: Auth — enter PIN
  // ════════════════════════════════════════════════════════════
  if (!currentUser && authView === "enterpin") return (
    <Shell>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        {/* Compact header at top */}
        <div style={{ background: G.green, padding: "18px 20px 16px", textAlign: "center" }}>
          <div style={{
            color: G.white, fontFamily: "'Playfair Display',serif",
            fontSize: 19, fontWeight: 900
          }}>Welcome back, {pendingMember?.name.split(" ")[0]}!</div>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 3 }}>Enter your PIN</div>
        </div>
        {/* Keypad pushed to lower portion of screen */}
        <div style={{ flex: 1, display: "flex", alignItems: "flex-end", paddingBottom: 60 }}>
          <div style={{ width: "100%" }}>
            <PinPad
              label="Enter your 4-digit PIN"
              onDone={handleEnterPin}
              onCancel={() => { setPendingMember(null); setAuthView("pick"); }}
              error={pinError}
            />
          </div>
        </div>
      </div>
    </Shell>
  );

  // ════════════════════════════════════════════════════════════
  // RENDER: App (authenticated)
  // ════════════════════════════════════════════════════════════

  // ── Header bar ─────────────────────────────────────────────
  const AppHeader = ({ onBack, title, sub, children }) => (
    <div style={{
      background: G.green, padding: "12px 16px",
      position: "sticky", top: 0, zIndex: 100
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: children ? 10 : 0 }}>
        {onBack
          ? <BackBtn onClick={onBack} />
          : <img src={FCC_LOGO} alt="FCC" className="fcc-header-logo"
            style={{
              width: 72, height: 72, borderRadius: "50%",
              objectFit: "cover", flexShrink: 0,
              border: "2.5px solid rgba(255,255,255,0.4)",
              boxShadow: "0 3px 12px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.1)"
            }} />
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: G.white, fontFamily: "'Playfair Display',serif",
            fontSize: 20, fontWeight: 900, lineHeight: 1.2
          }}>{title}</div>
          {sub && <div style={{
            color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 3,
            lineHeight: 1.4
          }}>{sub}</div>}
        </div>
        {/* User pill */}
        <button onClick={handleLogout}
          style={{
            background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 20,
            padding: "5px 10px", color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: 800,
            cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5
          }}>
          <span>{currentUser.name.split(" ")[0]}</span>
          <span style={{ opacity: .6 }}>· sign out</span>
        </button>
      </div>
      {children}
    </div>
  );

  // ── SCHEDULE ────────────────────────────────────────────────
  if (view === "schedule") {
    const myName = currentUser.name;
    const filteredUpcoming = upcoming.filter(s =>
      schedFilter === "all" || s.players.includes(myName));
    const filteredPast = past.filter(s =>
      schedFilter === "all" || s.players.includes(myName));
    // Block cals for schedule display — future + today only
    const upcomingBlocks = blockCals
      .filter(b => isFuture(b.date) || b.date === todayStr())
      .sort((a, b) => a.date.localeCompare(b.date) || a.from.localeCompare(b.from));

    return (
      <Shell sidebar={<SidebarNav view={view} setView={setView} userRole={userRole}
        currentUser={currentUser} onLogout={handleLogout} />}>
        {/* ── Schedule header — B+D hybrid ── */}
        <div style={{ background: G.green, position: "sticky", top: 0, zIndex: 100 }}>
          {/* Compact single bar: logo · date+title · avatar */}
          <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <img src={FCC_LOGO} alt="FCC" className="fcc-header-logo"
              style={{
                width: 30, height: 30, borderRadius: "50%", objectFit: "cover", flexShrink: 0,
                border: "1.5px solid rgba(255,255,255,0.3)"
              }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 11, color: "rgba(255,255,255,.45)",
                letterSpacing: "0.8px", textTransform: "uppercase", lineHeight: 1
              }}>
                {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
              </div>
              <div style={{
                fontSize: 15, fontWeight: 900, color: G.white, lineHeight: 1.2,
                fontFamily: "'Playfair Display',serif", marginTop: 1
              }}>Schedule</div>
            </div>
            <button onClick={() => setView("profile")}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(255,255,255,.1)", border: "0.5px solid rgba(255,255,255,.2)",
                borderRadius: 20, padding: "4px 10px 4px 5px", cursor: "pointer", flexShrink: 0
              }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%",
                background: "rgba(255,255,255,.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.9)"
              }}>
                {currentUser.name.split(" ")[0][0]}
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.8)" }}>
                {currentUser.name.split(" ")[0]}
              </span>
              <svg onClick={e => { e.stopPropagation(); handleLogout(); }} width="13" height="13"
                viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"
                title="Sign out" style={{ cursor: "pointer", marginLeft: 2 }}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>

          {/* Gold pill filter tabs — 3D pressed effect */}
          <div style={{ padding: "0 14px 10px", display: "flex", gap: 8 }}>
            {[
              { key: "all", label: "🏏 All Sessions" },
              { key: "mine", label: "✋ My Sessions" },
            ].map(({ key, label }) => {
              const active = schedFilter === key;
              return (
                <button key={key}
                  onClick={() => { setSchedFilter(key); setShowPastAll(false); setShowUpcomingAll(false); }}
                  style={{
                    flex: 1, padding: "7px 0", borderRadius: 20, cursor: "pointer",
                    fontFamily: "inherit", fontWeight: 800, fontSize: 11,
                    transition: "all .12s", whiteSpace: "nowrap", textAlign: "center",
                    background: active
                      ? "linear-gradient(180deg,#fcd34d 0%,#f59e0b 100%)"
                      : "rgba(251,191,36,.12)",
                    color: active ? "#1e3a5f" : "rgba(251,191,36,.65)",
                    border: active
                      ? "1px solid #b45309"
                      : "0.5px solid rgba(251,191,36,.3)",
                    boxShadow: active
                      ? "inset 0 1px 0 rgba(255,255,255,.35), inset 0 -2px 0 rgba(0,0,0,.15)"
                      : "none",
                    textShadow: active ? "0 1px 0 rgba(255,255,255,.3)" : "none"
                  }}>
                  {label}
                </button>
              );
            })}
            {(can(userRole, "sendReminder") || isCoachMember(currentUser?.name, teams)) && (
              <button onClick={() => setView("availability")}
                style={{
                  padding: "7px 12px", borderRadius: 20, cursor: "pointer",
                  fontFamily: "inherit", fontWeight: 800, fontSize: 13,
                  background: "rgba(255,255,255,.12)", color: "rgba(255,255,255,.8)",
                  border: "0.5px solid rgba(255,255,255,.2)", flexShrink: 0
                }}
                title="Team Availability">
                📊
              </button>
            )}
          </div>

          {/* Reminder strips */}
          {can(userRole, "sendReminder") && tomorrowSess.length > 0 && (
            <div style={{
              margin: "0 14px 10px", background: "rgba(251,191,36,.12)",
              border: "0.5px solid rgba(251,191,36,.25)",
              borderRadius: 10, padding: "8px 12px",
              display: "flex", alignItems: "center", justifyContent: "space-between"
            }}>
              <div style={{ color: "rgba(255,255,255,.75)", fontSize: 11, fontWeight: 700 }}>
                📅 {tomorrowSess.reduce((n, s) => n + s.players.length, 0)} players booked tomorrow
              </div>
              <Btn onClick={() => openWA(tomorrowStr())} bg="#fbbf24" col="#1e3a5f" sm>📲 Send Reminder</Btn>
            </div>
          )}
          {can(userRole, "sendReminder") && todaySess.length > 0 && (
            <div style={{
              margin: "0 14px 10px", background: "rgba(255,255,255,.08)",
              borderRadius: 10, padding: "8px 12px",
              display: "flex", alignItems: "center", justifyContent: "space-between"
            }}>
              <div style={{ color: "rgba(255,255,255,.8)", fontSize: 11, fontWeight: 700 }}>🟢 Training TODAY</div>
              <Btn onClick={() => openWA(todayStr())} bg="rgba(255,255,255,.18)" col={G.white} sm>📲 Share Today</Btn>
            </div>
          )}
        </div>

        <div style={{ padding: "14px 16px 20px" }}>

          {/* Profile nudge banner */}
          {(() => {
            const me = members.find(m => m.id === currentUser.id) || currentUser;
            const { pct, needsReconfirm, isComplete, confirmedAt } = profileCompletion(me);
            if (isComplete) return null;
            const isReconfirm = pct === 100 && needsReconfirm;
            return (
              <div style={{
                background: isReconfirm ? "#fffbeb" : "#fef2f2",
                border: `1.5px solid ${isReconfirm ? "#fcd34d" : "#fca5a5"}`,
                borderRadius: 12, padding: "12px 14px", marginBottom: 14,
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: 800, fontSize: 13,
                    color: isReconfirm ? "#92400e" : "#991b1b"
                  }}>
                    {isReconfirm ? "⏰ Time to reconfirm your details" : "👋 Complete your profile"}
                  </div>
                  <div style={{ fontSize: 12, color: isReconfirm ? "#b45309" : "#b91c1c", marginTop: 2 }}>
                    {isReconfirm
                      ? `Last confirmed ${confirmedAt ? confirmedAt.toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "never"} — please check your details are still current`
                      : `${100 - pct}% missing — add your ${!me?.email ? "email" : ""}${!me?.email && !me?.phone ? " & " : ""}${!me?.phone ? "phone" : ""} so the club can reach you`}
                  </div>
                </div>
                <button type="button" onClick={() => setView("profile")}
                  style={{
                    background: isReconfirm ? "#fcd34d" : "#fca5a5",
                    border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12,
                    fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
                    color: isReconfirm ? "#78350f" : "#7f1d1d", flexShrink: 0
                  }}>
                  {isReconfirm ? "Review" : "Update"}
                </button>
              </div>
            );
          })()}

          {/* ── Welcome card (dismissible, first login only) ── */}
          {!welcomeDismissed && (
            <div style={{
              background: `linear-gradient(135deg,${G.green} 0%,${G.mid} 100%)`,
              borderRadius: 14, padding: "16px 16px 14px", marginBottom: 14, position: "relative"
            }}>
              <button onClick={() => {
                setWelcomeDismissed(true);
                try { localStorage.setItem("fcc-welcome-v1", "1"); } catch { }
              }} style={{
                position: "absolute", top: 10, right: 12, background: "rgba(255,255,255,.15)",
                border: "none", borderRadius: 20, width: 24, height: 24, cursor: "pointer",
                color: "rgba(255,255,255,.8)", fontSize: 16, fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700
              }}>
                ×
              </button>
              <div style={{ fontWeight: 900, fontSize: 14, color: G.lime, marginBottom: 12 }}>
                👋 Welcome to FCC Training
              </div>
              {[
                ["📅", "Your weekly training is already here — your squad is auto-added each week"],
                ["🚪", "Can't make a session? Sign yourself out before 9pm the night before"],
                ["🏏", "Tap any session to see who's coming, vote in the poll, or set car pool"],
                ["➕", "Need extra nets time? Tap Book at the bottom"],
                ["👤", "Fill in your profile — add your number and email so the club can reach you"],
              ].map(([icon, text], i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  marginBottom: 8
                }}>
                  <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,.85)", lineHeight: 1.5 }}>
                    {text}
                  </span>
                </div>
              ))}
              {/* Guide links */}
              <div style={{
                borderTop: "1px solid rgba(255,255,255,.15)", marginTop: 10, paddingTop: 10,
                display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap"
              }}>
                <button onClick={() => window.open("https://training-app-guide.netlify.app", "_blank")}
                  style={{
                    background: G.lime, color: G.green, border: "none", borderRadius: 20,
                    padding: "6px 14px", fontWeight: 900, fontSize: 11, cursor: "pointer",
                    fontFamily: "inherit"
                  }}>
                  📖 Open full guide →
                </button>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>
                  or find it in My Profile → Help
                </span>
              </div>
            </div>
          )}

          {/* ── GDPR consent banner — existing members without consent ── */}
          {currentUser && !members.find(m => m.id === currentUser.id)?.consentGiven && (() => {
            const dismissKey = "fcc-gdpr-dismiss-v1";
            const dismissed = (() => { try { return sessionStorage.getItem(dismissKey) === "1"; } catch { return false; } })();
            if (dismissed) return null;
            return (
              <div style={{
                background: "#fffbeb", border: "1.5px solid #fde68a",
                borderRadius: 12, padding: "14px 16px", marginBottom: 12, position: "relative"
              }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: "#92400e", marginBottom: 6 }}>
                  🔐 A quick note about your data
                </div>
                <div style={{ fontSize: 12, color: "#78350f", lineHeight: 1.6, marginBottom: 12 }}>
                  Fredensborg CC stores your name, email and phone to manage your membership
                  and communicate about training. Your data stays within the club and is never
                  shared externally.
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => {
                    const updated = members.map(m => m.id === currentUser.id ? {
                      ...m,
                      consentGiven: true, consentDate: new Date().toISOString().slice(0, 10)
                    } : m);
                    saveMembers(updated);
                    showToast("Thanks — privacy policy acknowledged ✓");
                  }}
                    style={{
                      background: "#92400e", color: "#fff", border: "none", borderRadius: 20,
                      padding: "7px 16px", fontSize: 12, fontWeight: 800,
                      cursor: "pointer", fontFamily: "inherit"
                    }}>
                    I understand ✓
                  </button>
                  <button onClick={() => setView("privacy")}
                    style={{
                      background: "none", border: "1px solid #fde68a", borderRadius: 20,
                      padding: "7px 14px", fontSize: 12, fontWeight: 700, color: "#92400e",
                      cursor: "pointer", fontFamily: "inherit"
                    }}>
                    Read full policy
                  </button>
                  <button onClick={() => { try { sessionStorage.setItem(dismissKey, "1"); } catch { } }}
                    style={{
                      background: "none", border: "none", fontSize: 12, color: "#b45309",
                      cursor: "pointer", fontFamily: "inherit", textDecoration: "underline",
                      marginLeft: "auto", padding: "7px 0"
                    }}>
                    Dismiss for now
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Weather bar */}
          <WeatherBar wx={wxData} setView={setView} />

          {/* Nets timeline strip */}
          <NetsTimeline
            sessions={sessions}
            netsDate={netsDate}
            setNetsDate={setNetsDate}
            setView={setView}
            setBDate={setBDate}
            setBFrom={setBFrom}
            setBTo={setBTo}
            setBNet={setBNet}
          />

          {filteredUpcoming.length === 0 && filteredPast.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 16px", color: G.muted }}>
              <div style={{ fontSize: 54, marginBottom: 12 }}>
                {schedFilter === "mine" ? "🙋" : "🏟️"}
              </div>
              <div style={{ fontWeight: 900, fontSize: 17, color: G.text }}>
                {schedFilter === "mine" ? "You haven't joined any sessions yet" : "No sessions yet"}
              </div>
              <div style={{ fontSize: 13, marginTop: 6 }}>
                {schedFilter === "mine"
                  ? <span>Tap <b>All Sessions</b> to browse and join one.</span>
                  : 'Tap "+ Add / Join" to create the first one.'}
              </div>
            </div>
          ) : (
            <>
              {filteredUpcoming.length > 0 && (() => {
                const UPCOMING_LIMIT = 5;
                const visibleUpcoming = showUpcomingAll
                  ? filteredUpcoming
                  : filteredUpcoming.slice(0, UPCOMING_LIMIT);
                const hiddenCount = filteredUpcoming.length - UPCOMING_LIMIT;
                return <>
                  <SLbl mt={4}>Upcoming</SLbl>
                  {visibleUpcoming.map(s => <SessCard key={s.id} s={s} members={members} teams={teams}
                    onCarpoolClick={() => { setLiftDraft(null); setCarpoolSheetSess(s); }}
                    onClick={() => { setSelSess(s); setView("session"); setLiftEditing(false); setLiftDraft(null); setNotInExpanded(false); setCarpoolFocus(false); }} />)}
                  {filteredUpcoming.length > UPCOMING_LIMIT && (
                    <button onClick={() => setShowUpcomingAll(v => !v)}
                      style={{
                        width: "100%", padding: "8px 0", background: "none",
                        border: `1.5px dashed ${G.border}`, borderRadius: 10,
                        fontSize: 12, fontWeight: 700, color: G.muted, cursor: "pointer",
                        fontFamily: "inherit", marginBottom: 4
                      }}>
                      {showUpcomingAll
                        ? "▲ Show fewer"
                        : `▼ Show ${hiddenCount} more upcoming session${hiddenCount > 1 ? "s" : ""}`}
                    </button>
                  )}
                </>;
              })()}
              {filteredPast.length > 0 && (() => {
                const MAX_VISIBLE = 10;
                const visiblePast = showPastAll
                  ? filteredPast.slice(0, MAX_VISIBLE)
                  : filteredPast.slice(0, 1);
                const archived = filteredPast.slice(MAX_VISIBLE);
                return <>
                  <SLbl>Past</SLbl>
                  {visiblePast.map(s => <SessCard key={s.id} s={s} members={members} teams={teams} faded
                    onCarpoolClick={() => { setLiftDraft(null); setCarpoolSheetSess(s); }}
                    onClick={() => { setSelSess(s); setView("session"); setLiftEditing(false); setLiftDraft(null); setNotInExpanded(false); setCarpoolFocus(false); }} />)}
                  {/* Toggle button */}
                  {filteredPast.length > 1 && (
                    <button onClick={() => setShowPastAll(v => !v)}
                      style={{
                        width: "100%", padding: "8px 0", background: "none",
                        border: `1.5px dashed ${G.border}`, borderRadius: 10,
                        fontSize: 12, fontWeight: 700, color: G.muted, cursor: "pointer",
                        fontFamily: "inherit", marginBottom: 4
                      }}>
                      {showPastAll
                        ? `▲ Show less`
                        : `▼ Show ${Math.min(filteredPast.length - 1, MAX_VISIBLE - 1)} more past session${filteredPast.length > 2 ? "s" : ""}`}
                    </button>
                  )}
                  {/* Archived notice */}
                  {showPastAll && archived.length > 0 && (
                    <div style={{
                      fontSize: 11, color: G.muted, textAlign: "center",
                      padding: "6px 0 10px", fontWeight: 500
                    }}>
                      {archived.length} older session{archived.length > 1 ? "s" : ""} archived
                    </div>
                  )}
                </>;
              })()}
            </>
          )}

          {/* Nets Blocked — collapsed, shows 3 upcoming, expandable */}
          {upcomingBlocks.length > 0 && (
            <div style={{ marginTop: 24, marginBottom: 6 }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 8
              }}>
                <SLbl mt={0}>🚫 Nets Blocked</SLbl>
                {upcomingBlocks.length > 3 && (
                  <button onClick={() => setBlocksExpanded(e => !e)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: 12, fontWeight: 700, color: G.green, padding: "2px 0",
                      fontFamily: "inherit"
                    }}>
                    {blocksExpanded
                      ? "▲ Show less"
                      : `▼ Show all ${upcomingBlocks.length}`}
                  </button>
                )}
              </div>
              {(blocksExpanded ? upcomingBlocks : upcomingBlocks.slice(0, 3)).map(b => (
                <div key={b.id} style={{
                  background: "#fff7ed", border: "1.5px solid #fed7aa",
                  borderRadius: 10, padding: "10px 14px", marginBottom: 6
                }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: "#c2410c" }}>
                    🏏 {b.label || "Nets Blocked"} — {fmtShort(b.date)}
                  </div>
                  <div style={{ fontSize: 12, color: "#9a3412", marginTop: 2 }}>
                    {b.from} – {b.to} · Nets unavailable (match day)
                  </div>
                </div>
              ))}
              {!blocksExpanded && upcomingBlocks.length > 3 && (
                <div style={{ textAlign: "center", paddingTop: 2 }}>
                  <button onClick={() => setBlocksExpanded(true)}
                    style={{
                      background: "none", border: `1px dashed ${G.border}`, borderRadius: 8,
                      padding: "6px 18px", fontSize: 12, fontWeight: 700, color: G.muted,
                      cursor: "pointer", fontFamily: "inherit", width: "100%"
                    }}>
                    +{upcomingBlocks.length - 3} more blocked dates
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
        <BotNav view="schedule" setView={setView} userRole={userRole} pendingCount={joinRequests.filter(r => r.status === "pending").length} />
        {toast && <Toast msg={toast} />}

        {carpoolSheetSess && <CarpoolSheet
          sess={carpoolSheetSess}
          sessions={sessions}
          myName={currentUser?.name}
          liftDraft={liftDraft}
          setLiftDraft={setLiftDraft}
          liftEditing={liftEditing}
          setLiftEditing={setLiftEditing}
          saveSessions={saveSessions}
          selSess={selSess}
          setSelSess={setSelSess}
          onClose={() => { setCarpoolSheetSess(null); setLiftDraft(null); setLiftEditing(false); }}
        />}
      </Shell>
    );
  }

  // ── ADD / JOIN ──────────────────────────────────────────────
  if (view === "add") {
    const exactMatch = sessions.find(s => s.date === bDate && s.from === bFrom && s.to === bTo && (s.net === "both" || bNet === "both" || s.net === bNet));

    // Helper: do two net values conflict?
    function netsConflict(a, b) {
      if (!a || !b) return false;
      if (a === "both" || b === "both") return true; // "both" always conflicts
      return a === b; // same net conflicts
    }

    // All sessions on same date/time (excluding exact match)
    const overlappingSessions = bDate ? sessions.filter(s =>
      s.date === bDate && !exactMatch && timesOverlap(bFrom, bTo, s.from, s.to)
    ) : [];

    const overlappingRecurring = bDate ? recurring.filter(r => {
      if (!r.enabled) return false;
      const d = new Date(bDate);
      if (d.getDay() !== r.day) return false;
      if (r.activeFrom && bDate < r.activeFrom) return false;
      if (r.activeTo && bDate > r.activeTo) return false;
      return !exactMatch && timesOverlap(bFrom, bTo, r.from, r.to);
    }) : [];

    // Net clash: same net (or either is "both") at overlapping time
    const netClash = overlappingSessions.find(s => netsConflict(s.net, bNet)) || overlappingRecurring.find(r => netsConflict(r.net, bNet));

    // Player clash: any selected player already in ANY overlapping session
    const clashSess = overlappingSessions.find(s => selP.some(p => s.players.includes(p)));
    const clashPlayers = clashSess ? selP.filter(p => clashSess.players.includes(p)) : [];
    const alreadyIn = clashSess ? clashPlayers.filter(p => clashSess.players.includes(p) && selP.includes(p)) : [];
    const bookingUser = currentUser?.name;
    const userAlreadyIn = alreadyIn.includes(bookingUser);
    const othersAlreadyIn = alreadyIn.filter(p => p !== bookingUser);

    // Either type of clash blocks submission
    const hasAnyClash = !exactMatch && (!!netClash || !!clashSess);
    return (
      <Shell>
        <AppHeader onBack={() => { setView("schedule"); setSelP([]); }}
          title="Book a Session"
          sub={exactMatch ? "Session exists at this time" : "Create or join a training session"} />
        {/* Exact match warning — prominent, not just a subtitle */}
        {exactMatch && (
          <div style={{
            background: "#fef9c3", border: "1.5px solid #fde047",
            borderRadius: 12, padding: "12px 16px", margin: "0 16px 4px",
            display: "flex", alignItems: "flex-start", gap: 10
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>📋</span>
            <div>
              <div style={{ fontWeight: 900, fontSize: 13, color: "#92400e", marginBottom: 3 }}>
                A session already exists at this time
              </div>
              <div style={{ fontSize: 12, color: "#78350f", lineHeight: 1.5 }}>
                <b>{exactMatch.label || "Session"}</b> · {exactMatch.from}–{exactMatch.to} · {exactMatch.players.length} player{exactMatch.players.length !== 1 ? "s" : ""} booked.
                {" "}Submitting will <b>add the selected players</b> to that existing session.
              </div>
            </div>
          </div>
        )}
        <form onSubmit={handleAddSession} style={{ padding: "14px 16px 20px" }}>
          <SLbl mt={4}>When?</SLbl>
          <div style={{
            background: G.white, borderRadius: 12, border: `1.5px solid ${G.border}`,
            padding: 14, marginBottom: 12
          }}>
            <FFld label="Date">
              <input type="date" style={iSt({ fontSize: 14, padding: "9px 10px" })} value={bDate}
                min={todayStr()} onChange={e => setBDate(e.target.value)} required />
            </FFld>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <FFld label="From" style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 4 }}>
                  <select style={iSt({ flex: 1, fontSize: 13, padding: "9px 4px", textAlign: "center" })}
                    value={bFrom.split(":")[0]}
                    onChange={e => {
                      const h = e.target.value;
                      const m = bFrom.split(":")[1] || "00";
                      setBFrom(`${h}:${m}`);
                      // Auto-advance end time by 1 hour
                      const nextH = String(Math.min(23, parseInt(h) + 1)).padStart(2, "0");
                      setBTo(`${nextH}:${m}`);
                    }}>
                    {Array.from({ length: 24 }, (_, i) => {
                      const h = String(i).padStart(2, "0");
                      return <option key={h} value={h}>{h}</option>;
                    })}
                  </select>
                  <select style={iSt({ width: 58, fontSize: 13, padding: "9px 2px", textAlign: "center", flexShrink: 0 })}
                    value={bFrom.split(":")[1] || "00"}
                    onChange={e => {
                      const h = bFrom.split(":")[0] || "18";
                      setBFrom(`${h}:${e.target.value}`);
                    }}>
                    {["00", "15", "30", "45"].map(m => (
                      <option key={m} value={m}>:{m}</option>
                    ))}
                  </select>
                </div>
              </FFld>
              <FFld label="Until" style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 4 }}>
                  <select style={iSt({ flex: 1, fontSize: 13, padding: "9px 4px", textAlign: "center" })}
                    value={bTo.split(":")[0]}
                    onChange={e => {
                      const h = e.target.value;
                      const m = bTo.split(":")[1] || "00";
                      setBTo(`${h}:${m}`);
                    }}>
                    {Array.from({ length: 24 }, (_, i) => {
                      const h = String(i).padStart(2, "0");
                      const isLeader = ["superadmin", "admin", "captain", "vicecaptain"].includes(userRole);
                      const isAdmin = ["superadmin", "admin"].includes(userRole);
                      const prime = (!isLeader) && bFrom ? isPrimeTime(bFrom, bDate) : false;
                      const maxMins = toMinsNet(bFrom) + (prime ? 60 : 120);
                      const disabled = !isAdmin && (i * 60 > maxMins || i * 60 <= toMinsNet(bFrom));
                      return <option key={h} value={h} disabled={disabled}>{h}</option>;
                    })}
                  </select>
                  <select style={iSt({ width: 58, fontSize: 13, padding: "9px 2px", textAlign: "center", flexShrink: 0 })}
                    value={bTo.split(":")[1] || "00"}
                    onChange={e => {
                      const h = bTo.split(":")[0] || "20";
                      setBTo(`${h}:${e.target.value}`);
                    }}>
                    {["00", "15", "30", "45"].map(m => {
                      const isLeader = ["superadmin", "admin", "captain", "vicecaptain"].includes(userRole);
                      const isAdmin = ["superadmin", "admin"].includes(userRole);
                      const prime = (!isLeader) && bFrom ? isPrimeTime(bFrom, bDate) : false;
                      const maxMins = toMinsNet(bFrom) + (prime ? 60 : 120);
                      const optionMins = Number(bTo.split(":")[0]) * 60 + Number(m);
                      const disabled = !isAdmin && (optionMins > maxMins || optionMins <= toMinsNet(bFrom));
                      return <option key={m} value={m} disabled={disabled}>:{m}</option>;
                    })}
                  </select>
                </div>
              </FFld>
            </div>
            <FFld label="Net" style={{ marginTop: 10 }}>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  ["1", <><NetIcon color={bNet === "1" ? G.lime : G.text} size={16} /> Net 1</>],
                  ["2", <><NetIcon color={bNet === "2" ? G.lime : G.text} size={16} /> Net 2</>],
                  ["both", <><BothNetsIcon color={bNet === "both" ? G.lime : G.text} size={16} /> Both</>],
                ].map(([val, lbl]) => (
                  <button key={val} type="button" onClick={() => setBNet(val)}
                    style={{
                      flex: 1, background: bNet === val ? G.green : G.white,
                      color: bNet === val ? G.lime : G.text,
                      border: bNet === val ? `2px solid ${G.green}` : `1.5px solid ${G.border}`,
                      borderRadius: 10, padding: "10px 6px", fontSize: 13, fontWeight: 700,
                      cursor: "pointer", fontFamily: "inherit", transition: "all .12s",
                      textAlign: "center", display: "flex", alignItems: "center",
                      justifyContent: "center", gap: 6
                    }}>
                    {lbl}
                  </button>
                ))}
              </div>
              {bNet === "both" && selP.length < 8 && (
                <div style={{
                  marginTop: 8, background: "#fff7ed", border: "1.5px solid #fed7aa",
                  borderRadius: 8, padding: "8px 11px", fontSize: 12, color: "#92400e", lineHeight: 1.5
                }}>
                  ⚠️ <b>Heads up:</b> You have fewer than 8 players. Consider booking just one net
                  so the other stays free for others.
                </div>
              )}
            </FFld>
            {/* Prime hours note — members only */}
            {bDate && bFrom && !["superadmin", "admin", "captain", "vicecaptain"].includes(userRole) && (() => {
              const prime = isPrimeTime(bFrom, bDate);
              return (
                <div style={{
                  marginTop: 10, padding: "7px 10px", background: "#fffbeb",
                  borderRadius: 8, border: "1px solid #fde68a",
                  display: "flex", alignItems: "flex-start", gap: 5
                }}>
                  <span style={{ fontSize: 11, flexShrink: 0 }}>⭐</span>
                  <p style={{ margin: 0, fontSize: 10, color: "#b45309", lineHeight: 1.6 }}>
                    <b style={{ color: "#92400e", whiteSpace: "nowrap" }}>Prime Hours</b>
                    {" "}— Bookings are for max.{" "}
                    {prime
                      ? <b>1 hour</b>
                      : <b>2 hours</b>}
                    {" "}slots during{" "}
                    <span style={{ whiteSpace: "nowrap" }}>(<b>17–20</b> daily</span>
                    {" "}&amp;{" "}
                    <span style={{ whiteSpace: "nowrap" }}><b>9–13</b> weekends)</span>
                    {" "}and 2 hours at all other times to allow fair access to the nets for everyone.
                    {prime && <b style={{ color: "#92400e" }}> Your selected start time is in a peak slot.</b>}
                  </p>
                </div>
              );
            })()}
            <FFld label="Note (optional)" style={{ marginTop: 10 }}>
              <input style={iSt()} placeholder="e.g. Bring extra balls"
                value={bNote} onChange={e => setBNote(e.target.value)} />
            </FFld>
          </div>

          {/* ── Overlap warning ───────────────────────────────── */}
          {(netClash || clashSess) && !exactMatch && (
            <div style={{
              background: "#fef2f2", border: "1.5px solid #fca5a5",
              borderRadius: 12, padding: "13px 15px", marginBottom: 12
            }}>
              <div style={{ fontWeight: 900, fontSize: 13, color: "#991b1b", marginBottom: 6 }}>
                🚫 Time conflict detected
              </div>
              <div style={{ fontSize: 12, color: "#7f1d1d", lineHeight: 1.7, marginBottom: 10 }}>
                {netClash && (
                  <div style={{ marginBottom: clashSess ? 6 : 0 }}>
                    <b>{netClash.net === "both" ? "Both nets are" :
                      `Net ${netClash.net} is`} already booked</b>{" "}
                    {netClash.from}–{netClash.to}
                    {(netClash.label || netClash.name) ? ` · ${(netClash.label || netClash.name)}` : ""}.
                    {" "}Pick a different time{bNet !== netClash.net ? " or switch nets" : ""}.
                  </div>
                )}
                {clashSess && !netClash && (
                  <>
                    {userAlreadyIn && othersAlreadyIn.length === 0 && (
                      <>You're already in <b>{clashSess.label || "a session"}</b> ({clashSess.from}–{clashSess.to}).</>
                    )}
                    {userAlreadyIn && othersAlreadyIn.length > 0 && (
                      <>You and <b>{othersAlreadyIn.join(", ")}</b> are already in <b>{clashSess.label || "a session"}</b> ({clashSess.from}–{clashSess.to}).</>
                    )}
                    {!userAlreadyIn && othersAlreadyIn.length > 0 && (
                      <><b>{othersAlreadyIn.join(", ")}</b> {othersAlreadyIn.length > 1 ? "are" : "is"} already in <b>{clashSess.label || "a session"}</b> ({clashSess.from}–{clashSess.to}).</>
                    )}
                  </>
                )}
              </div>
              {/* Action buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {clashSess && !netClash && (
                  <button type="button"
                    onClick={() => { setSelSess(clashSess); setView("session"); setSelP([]); }}
                    style={{
                      width: "100%", padding: "9px 12px", borderRadius: 9,
                      border: "1.5px solid #fca5a5", background: "#fff",
                      color: "#991b1b", fontWeight: 700, fontSize: 12,
                      cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                      display: "flex", alignItems: "center", gap: 8
                    }}>
                    <span>👉</span>
                    <span>View <b>{clashSess.label || "that session"}</b> and join instead</span>
                  </button>
                )}
                {netClash && (
                  <div style={{ fontSize: 11, color: "#991b1b", fontWeight: 700 }}>
                    Suggested times nearby:
                    <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                      {(() => {
                        // Suggest slots before and after the clash
                        const clashEnd = netClash.to;
                        const clashStart = netClash.from;
                        const dur = toMinsNet(bTo) - toMinsNet(bFrom);
                        const beforeFrom = `${String(Math.floor((toMinsNet(clashStart) - dur) / 60)).padStart(2, "0")}:${String((toMinsNet(clashStart) - dur) % 60).padStart(2, "0")}`;
                        const afterTo = `${String(Math.floor((toMinsNet(clashEnd) + dur) / 60)).padStart(2, "0")}:${String((toMinsNet(clashEnd) + dur) % 60).padStart(2, "0")}`;
                        return [
                          { label: `Before: ${beforeFrom}–${clashStart}`, from: beforeFrom, to: clashStart },
                          { label: `After: ${clashEnd}–${afterTo}`, from: clashEnd, to: afterTo },
                        ].filter(s => toMinsNet(s.from) >= 0 && toMinsNet(s.to) <= toMinsNet("22:00")).map(s => (
                          <button key={s.from} type="button"
                            onClick={() => { setBFrom(s.from); setBTo(s.to); }}
                            style={{
                              padding: "5px 10px", borderRadius: 20, border: "1.5px solid #fca5a5",
                              background: "#fff", color: "#991b1b", fontWeight: 700, fontSize: 11,
                              cursor: "pointer", fontFamily: "inherit"
                            }}>
                            {s.label}
                          </button>
                        ));
                      })()}
                    </div>
                  </div>
                )}
                <button type="button"
                  onClick={() => { setBDate(""); setBFrom("18:00"); setBTo("20:00"); }}
                  style={{
                    width: "100%", padding: "9px 12px", borderRadius: 9,
                    border: "1.5px solid #fca5a5", background: "#fff",
                    color: "#7f1d1d", fontWeight: 600, fontSize: 12,
                    cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                    display: "flex", alignItems: "center", gap: 8
                  }}>
                  <span>🗓️</span>
                  <span>Pick a different date / time</span>
                </button>
              </div>
            </div>
          )}

          <SLbl>Who's coming? {selP.length > 0 && `(${selP.length} selected)`}</SLbl>
          {(["superadmin", "admin", "captain", "vicecaptain"].includes(userRole)) && bRestrictTeam && (
            <div style={{
              background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 8,
              padding: "8px 12px", marginBottom: 10, fontSize: 12, color: "#1e40af", lineHeight: 1.5
            }}>
              <b>👥 Auto-enroll on:</b> All members of <b>{bRestrictTeam}</b> will be
              automatically added when you create this session.
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input style={iSt({ flex: 1, background: G.white })}
              placeholder="🔍  Search players…" value={pSearch}
              onChange={e => setPSearch(e.target.value)} />
          </div>

          {selP.length > 0 && (
            <div style={{
              background: G.sand, borderRadius: 10, padding: "9px 13px",
              marginBottom: 10, display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center"
            }}>
              <span style={{
                fontSize: 10, fontWeight: 900, color: G.text,
                letterSpacing: 1.5, textTransform: "uppercase", marginRight: 4
              }}>Selected:</span>
              {selP.map(p => (
                <button key={p} type="button"
                  onClick={() => setSelP(ps => ps.filter(x => x !== p))}
                  style={{
                    background: G.green, color: G.lime, border: "none", borderRadius: 20,
                    padding: "3px 10px", fontSize: 12, fontWeight: 800,
                    cursor: "pointer", fontFamily: "inherit"
                  }}>
                  {p} ×
                </button>
              ))}
            </div>
          )}

          {(() => {
            const entries = Object.entries(pickGrouped);
            const myTeamsSet = new Set(myTeamsList);
            const myEntries = entries.filter(([t]) => myTeamsSet.has(t));
            const otherEntries = entries.filter(([t]) => !myTeamsSet.has(t));
            // Count how many players from other groups are already selected
            const otherSelected = otherEntries.reduce((n, [, list]) =>
              n + list.filter(m => selP.includes(m.name)).length, 0);
            // If user has no team, show everything normally
            const hasTeam = myTeamsList.length > 0;
            const showEntries = hasTeam ? myEntries : entries;
            return (<>
              {showEntries.map(([team, list]) => (
                <div key={team} style={{ marginBottom: 14 }}>
                  <div style={{ marginBottom: 7, display: "flex", alignItems: "center", gap: 7 }}>
                    <TeamPill team={team} />
                    {hasTeam && <span style={{
                      fontSize: 10, fontWeight: 800, color: G.green,
                      background: "#dcfce7", borderRadius: 99, padding: "1px 7px"
                    }}>
                      Your group
                    </span>}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {list.map(m => {
                      const sel = selP.includes(m.name);
                      return (
                        <button key={m.id} type="button"
                          onClick={() => setSelP(ps => sel ? ps.filter(x => x !== m.name) : [...ps, m.name])}
                          style={{
                            background: sel ? G.green : G.white, color: sel ? G.lime : G.text,
                            border: sel ? `2px solid ${G.green}` : `1.5px solid ${G.border}`,
                            borderRadius: 24, padding: "7px 14px", fontSize: 13, fontWeight: 700,
                            cursor: "pointer", fontFamily: "inherit", transition: "all .1s"
                          }}>
                          {sel && "✓ "}{m.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {hasTeam && otherEntries.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <button type="button"
                    onClick={() => setOtherGroupsOpen(o => !o)}
                    style={{
                      width: "100%", background: "none", border: `1.5px dashed ${G.border}`,
                      borderRadius: 10, padding: "9px 14px", cursor: "pointer", fontFamily: "inherit",
                      display: "flex", alignItems: "center", justifyContent: "space-between"
                    }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: G.muted }}>
                      {otherGroupsOpen ? "▲" : "▼"} Other Groups
                      {" "}
                      <span style={{ color: G.text }}>
                        ({otherEntries.reduce((n, [, l]) => n + l.length, 0)} players)
                      </span>
                    </span>
                    {otherSelected > 0 && (
                      <span style={{
                        background: G.green, color: G.lime, borderRadius: 99,
                        padding: "1px 8px", fontSize: 11, fontWeight: 800
                      }}>
                        {otherSelected} selected
                      </span>
                    )}
                  </button>

                  {otherGroupsOpen && (
                    <div style={{ marginTop: 10 }}>
                      {otherEntries.map(([team, list]) => (
                        <div key={team} style={{ marginBottom: 14 }}>
                          <div style={{ marginBottom: 7 }}><TeamPill team={team} /></div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {list.map(m => {
                              const sel = selP.includes(m.name);
                              return (
                                <button key={m.id} type="button"
                                  onClick={() => setSelP(ps => sel ? ps.filter(x => x !== m.name) : [...ps, m.name])}
                                  style={{
                                    background: sel ? G.green : G.white, color: sel ? G.lime : G.text,
                                    border: sel ? `2px solid ${G.green}` : `1.5px solid ${G.border}`,
                                    borderRadius: 24, padding: "7px 14px", fontSize: 13, fontWeight: 700,
                                    cursor: "pointer", fontFamily: "inherit", transition: "all .1s"
                                  }}>
                                  {sel && "✓ "}{m.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>);
          })()}

          {/* Lift preference — only shown when current user is in the session */}
          {selP.includes(currentUser?.name) && (
            <div style={{ marginBottom: 14 }}>
              <SLbl>Your lift preference <span style={{ fontWeight: 500, color: G.muted }}>(optional)</span></SLbl>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { val: "offer", label: "🚘 I can offer a lift", activeCol: "#14532d", activeTxt: "#a3e635" },
                  { val: "need", label: "🙋 I need a lift", activeCol: "#1e3a5f", activeTxt: "#93c5fd" },
                  { val: "self", label: "🚀 Own transport", activeCol: G.cream, activeTxt: G.muted },
                ].map(opt => (
                  <button key={opt.val} type="button"
                    onClick={() => setBLift(bLift === opt.val && opt.val !== "" ? "" : opt.val)}
                    style={{
                      flex: 1, padding: "9px 6px", borderRadius: 10, fontFamily: "inherit",
                      fontSize: 11, fontWeight: 700, cursor: "pointer", border: "1.5px solid",
                      borderColor: bLift === opt.val ? opt.activeCol : G.border,
                      background: bLift === opt.val ? opt.activeCol : G.white,
                      color: bLift === opt.val ? opt.activeTxt : G.muted,
                      transition: "all .14s", lineHeight: 1.3,
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <SLbl>Session Poll <span style={{ fontWeight: 500, color: G.muted }}>(optional)</span></SLbl>          <div style={{
            background: G.white, borderRadius: 12, border: `1.5px solid ${G.border}`,
            padding: 14, marginBottom: 14
          }}>
            {/* Preset options */}
            <div style={{
              fontSize: 11, fontWeight: 700, color: G.muted, textTransform: "uppercase",
              letterSpacing: 1.2, marginBottom: 8
            }}>Tap to add preset options</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
              {PRESET_POLL.map(p => {
                const active = bPollOpts.find(o => o.id === p.id);
                return (
                  <button key={p.id} type="button"
                    onClick={() => setBPollOpts(ps => active
                      ? ps.filter(o => o.id !== p.id)
                      : [...ps, { id: p.id, label: p.label }])}
                    style={{
                      background: active ? G.green : G.cream,
                      color: active ? G.lime : G.text,
                      border: active ? `2px solid ${G.green}` : `1.5px solid ${G.border}`,
                      borderRadius: 24, padding: "8px 14px", fontSize: 13, fontWeight: 700,
                      cursor: "pointer", fontFamily: "inherit", transition: "all .12s"
                    }}>
                    {active && "✓ "}{p.label}
                  </button>
                );
              })}
            </div>
            {/* Custom option input */}
            <div style={{
              fontSize: 11, fontWeight: 700, color: G.muted, textTransform: "uppercase",
              letterSpacing: 1.2, marginBottom: 7
            }}>Add a custom option</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input style={iSt({ flex: 1, padding: "9px 12px", fontSize: 13 })}
                placeholder="e.g. Match prep, Throw-downs…"
                value={bCustomOpt}
                onChange={e => setBCustomOpt(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const t = bCustomOpt.trim();
                    if (t && !bPollOpts.find(o => o.label.toLowerCase() === t.toLowerCase())) {
                      setBPollOpts(ps => [...ps, { id: uid(), label: t }]);
                      setBCustomOpt("");
                    }
                  }
                }} />
              <Btn type="button" bg={G.green} col={G.lime}
                onClick={() => {
                  const t = bCustomOpt.trim();
                  if (t && !bPollOpts.find(o => o.label.toLowerCase() === t.toLowerCase())) {
                    setBPollOpts(ps => [...ps, { id: uid(), label: t }]);
                    setBCustomOpt("");
                  }
                }}>+ Add</Btn>
            </div>
            {/* Selected poll options preview */}
            {bPollOpts.length > 0 && (
              <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {bPollOpts.map(o => (
                  <span key={o.id} style={{
                    background: "#ede9fe", color: "#5b21b6",
                    borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 800,
                    display: "flex", alignItems: "center", gap: 6
                  }}>
                    {o.label}
                    <button type="button" onClick={() => setBPollOpts(ps => ps.filter(p => p.id !== o.id))}
                      style={{
                        background: "none", border: "none", color: "#5b21b6", cursor: "pointer",
                        fontWeight: 900, padding: 0, fontSize: 13, lineHeight: 1
                      }}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <Btn type="submit" bg={hasAnyClash ? G.muted : G.green} col={G.lime} full
            disabled={hasAnyClash}
            style={{ opacity: hasAnyClash ? 0.5 : 1, cursor: hasAnyClash ? "not-allowed" : "pointer" }}>
            {hasAnyClash ? "🚫 Fix conflict above to continue" : "🏏 Confirm Session"}
          </Btn>
          <p style={{ fontSize: 11, color: G.muted, textAlign: "center", marginTop: 8 }}>
            Existing session at same date & time? Players are auto-added.
          </p>
        </form>
        <BotNav view="add" setView={setView} userRole={userRole} pendingCount={joinRequests.filter(r => r.status === "pending").length} />
        {toast && <Toast msg={toast} />}
      </Shell>
    );
  }

  // ── SESSION DETAIL ──────────────────────────────────────────
  if (view === "session" && selSess) {
    const userMem = members.find(m => m.name === currentUser?.name);
    const isRestricted = !!selSess.restrictedTo;
    const userInTeam = !isRestricted
      || (userMem?.teams || []).includes(selSess.restrictedTo)
      || canOrCoach(userRole, "deleteSession", userMem, teams);
    const canAddOthers = canOrCoach(userRole, "addOtherPlayer", userMem, teams);
    const cutoff = isAfterCutoff(selSess.date);
    // Members not in session — admins/captains/coaches see all relevant, members only see own team
    const notIn = members.filter(m => !selSess.players.includes(m.name))
      .filter(m => {
        if (isRestricted) return (m.teams || []).includes(selSess.restrictedTo) || canOrCoach(userRole, "deleteSession", userMem, teams);
        if (!canAddOthers) return (m.teams || []).some(t => (userMem?.teams || []).includes(t));
        return true;
      });
    // Who's NOT coming from user's own team (or restricted team) — for the "absent" list
    const myTeams = userMem?.teams || [];
    const relevantTeam = isRestricted ? selSess.restrictedTo : (myTeams[0] || null);
    const absentFromTeam = relevantTeam
      ? members.filter(m => (m.teams || []).includes(relevantTeam) && !selSess.players.includes(m.name))
      : [];
    return (
      <Shell>
        <AppHeader
          onBack={() => { setView("schedule"); setSelSess(null); }}
          title={<>{fmtShort(selSess.date)}{isToday(selSess.date) &&
            <span style={{
              background: G.lime, color: G.green, borderRadius: 20,
              padding: "1px 8px", fontSize: 11, fontWeight: 900, marginLeft: 8
            }}>TODAY</span>}</>}
          sub={`${selSess.from} – ${selSess.to}${selSess.label ? " · " + selSess.label : ""}`}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn onClick={() => dlICS(selSess)} bg="rgba(255,255,255,.15)" col={G.white} sm>
              📅 Save to Calendar
            </Btn>
            {can(userRole, "sendReminder") && (
              <Btn onClick={() => openWA(selSess.date)} bg={G.lime} col={G.green} sm>
                📲 Share on WhatsApp
              </Btn>
            )}
          </div>
        </AppHeader>

        <div style={{ padding: "14px 16px 20px" }}>
          {selSess.note && (
            <div style={{
              background: "#fff8e1", border: "1.5px solid #ffe082", borderRadius: 10,
              padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#7a5c00", fontWeight: 500
            }}>
              📋 {selSess.note}
            </div>
          )}

          {isRestricted && (
            <div style={{
              background: userInTeam ? "#f0fdf4" : "#fef9c3",
              border: `1.5px solid ${userInTeam ? G.lime : "#fde047"}`,
              borderRadius: 10, padding: "10px 14px", marginBottom: 14,
              fontSize: 13, fontWeight: 700,
              color: userInTeam ? G.green : "#92400e",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: 18 }}>🔒</span>
              <span>
                {userInTeam
                  ? `${selSess.restrictedTo} session — you're in`
                  : `This session is restricted to ${selSess.restrictedTo} members. You can view but not join.`}
              </span>
            </div>
          )}

          {/* ── Coaches for this session — team sessions only ── */}
          {(selSess.restrictedTo || selSess.sessionTeams?.length) && (() => {
            const derivedCoaches = selSess.coaches !== undefined
              ? selSess.coaches
              : [...new Set((selSess.sessionTeams || [selSess.restrictedTo].filter(Boolean)).flatMap(tn =>
                teams.find(t => t.name === tn)?.coaches || []
              ))];
            const sessCoaches = derivedCoaches;
            const canEditCoaches = canOrCoach(userRole, "addOtherPlayer", userMem, teams);
            return (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: G.muted,
                    textTransform: "uppercase", letterSpacing: 1
                  }}>🧢 Coaches</span>
                  {sessCoaches.length > 0 ? sessCoaches.map(name => (
                    <span key={name} style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 10px",
                      borderRadius: 20, background: "#fef9c3", color: "#92400e",
                      border: "0.5px solid #fde68a"
                    }}>
                      🧢 {name}
                    </span>
                  )) : (
                    <span style={{ fontSize: 11, color: G.muted, fontStyle: "italic" }}>None assigned</span>
                  )}
                </div>
                {/* Coach editor — captains/admins/coaches only */}
                {canEditCoaches && (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontSize: 10, color: G.muted, marginBottom: 5 }}>
                      Tap to add/remove coaches for this session:
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {members.filter(m => isCoachMember(m.name, teams)).sort((a, b) => a.name.localeCompare(b.name)).map(m => {
                        const on = sessCoaches.includes(m.name);
                        return (
                          <button key={m.id} type="button"
                            onClick={() => {
                              const newList = on
                                ? sessCoaches.filter(n => n !== m.name)
                                : [...sessCoaches, m.name];
                              const updSess = { ...selSess, coaches: newList };
                              setSelSess(updSess);
                              saveSessions(sessions.map(s => s.id === selSess.id ? updSess : s));
                            }}
                            style={{
                              fontSize: 11, fontWeight: 700, padding: "3px 10px",
                              borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
                              background: on ? "#fef9c3" : "var(--color-bg,#f8fafc)",
                              color: on ? "#92400e" : G.muted,
                              border: `1px solid ${on ? "#fde68a" : "rgba(0,0,0,.1)"}`,
                              transition: "all .13s"
                            }}>
                            {on ? "🧢 " : "+ "}{m.name.split(" ")[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <SLbl mt={4}>Players ({selSess.players.length})</SLbl>
          {/* ── Persistent carpool section ─────────────────── */}
          {userInTeam && !cutoff && (() => {
            const lifts = selSess.lifts || {};
            const myName = currentUser?.name;
            const myLiftObj = getLiftObj(lifts[myName]);
            const myPref = myLiftObj.pref;
            const isO = myPref === "offer", isN = myPref === "need", isSelf = myPref === "self";
            const dispS = d => { const o = getLiftObj(d); if (!o.stop) return ""; return o.stop === "Other" ? (o.stopOther || "Other") : o.stop; };
            // Others who have set a pref (not current user)
            const otherOffers = selSess.players.filter(p => p !== myName && getLiftPref(lifts[p]) === "offer");
            const otherNeeds = selSess.players.filter(p => p !== myName && getLiftPref(lifts[p]) === "need");
            const anyOthers = otherOffers.length || otherNeeds.length;
            if (!myPref && !anyOthers) {
              // No prefs at all — show compact prompt
              return (
                <button onClick={() => { setLiftDraft(null); setCarpoolSheetSess(selSess); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "11px 14px", marginBottom: 10, borderRadius: 10, cursor: "pointer",
                    fontFamily: "inherit", textAlign: "left",
                    background: "#f8fdf9", border: "1px solid #c6f0d0", boxSizing: "border-box"
                  }}>
                  <span style={{ fontSize: 20 }}>🚘</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: G.green }}>Car pool</div>
                    <div style={{ fontSize: 11, color: G.muted, marginTop: 1 }}>Tap to set your travel preference</div>
                  </div>
                  <span style={{ fontSize: 16, color: G.green }}>›</span>
                </button>
              );
            }
            // At least one pref set — show full section
            return (
              <div style={{
                background: "#f8fdf9", border: "1px solid #c6f0d0", borderRadius: 12,
                padding: "10px 13px", marginBottom: 12
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 800, color: G.muted, textTransform: "uppercase",
                  letterSpacing: 1.1, marginBottom: 8
                }}>🚘 Car pool</div>
                {/* Others */}
                {otherOffers.map(name => {
                  const obj = getLiftObj(lifts[name]); const loc = dispS(lifts[name]);
                  return <div key={name} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "1px 8px", borderRadius: 20,
                      background: "#dcfce7", color: "#166534", border: "0.5px solid #86efac"
                    }}>🚘 Offering</span>
                    <span style={{ fontWeight: 700, fontSize: 12, color: G.text }}>{name}</span>
                    {obj.seats > 0 && <span style={{ fontSize: 11, color: G.muted }}>💺{obj.seats}</span>}
                    {loc && <span style={{ fontSize: 11, color: G.muted }}>📍{loc}</span>}
                    {obj.note && <span style={{ fontSize: 11, color: G.muted, fontStyle: "italic" }}>"{obj.note}"</span>}
                  </div>;
                })}
                {otherNeeds.map(name => {
                  const obj = getLiftObj(lifts[name]); const loc = dispS(lifts[name]);
                  return <div key={name} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "1px 8px", borderRadius: 20,
                      background: "#dbeafe", color: "#1e3a5f", border: "0.5px solid #93c5fd"
                    }}>🙋 Needs lift</span>
                    <span style={{ fontWeight: 700, fontSize: 12, color: G.text }}>{name}</span>
                    {loc && <span style={{ fontSize: 11, color: G.muted }}>📍{loc}</span>}
                    {obj.note && <span style={{ fontSize: 11, color: G.muted, fontStyle: "italic" }}>"{obj.note}"</span>}
                  </div>;
                })}
                {/* Divider before my row */}
                {anyOthers > 0 && <div style={{ borderTop: `0.5px solid #c6f0d0`, margin: "6px 0" }} />}
                {/* My preference */}
                {myPref ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "1px 8px", borderRadius: 20,
                      background: isO ? "#dcfce7" : isN ? "#dbeafe" : "rgba(0,0,0,.05)",
                      color: isO ? "#166534" : isN ? "#1e3a5f" : G.muted,
                      border: `0.5px solid ${isO ? "#86efac" : isN ? "#93c5fd" : "rgba(0,0,0,.1)"}`
                    }}>
                      {isO ? "🚘 You: Offering" : isN ? "🙋 You: Need lift" : "🚀 You: Own transport"}
                    </span>
                    {isO && myLiftObj.seats > 0 && <span style={{ fontSize: 11, color: G.muted }}>💺{myLiftObj.seats}</span>}
                    {dispS(myLiftObj) && <span style={{ fontSize: 11, color: G.muted }}>📍{dispS(myLiftObj)}</span>}
                    {myLiftObj.note && <span style={{ fontSize: 11, color: G.muted, fontStyle: "italic" }}>"{myLiftObj.note}"</span>}
                    <button onClick={() => { setLiftDraft({ ...myLiftObj }); setCarpoolSheetSess(selSess); }}
                      style={{
                        fontSize: 11, background: "none", border: "none", color: G.muted,
                        textDecoration: "underline", cursor: "pointer", fontFamily: "inherit", padding: 0
                      }}>Edit</button>
                  </div>
                ) : (
                  <button onClick={() => { setLiftDraft(null); setCarpoolSheetSess(selSess); }}
                    style={{
                      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                      border: `1px solid #c6f0d0`, background: G.white, color: G.green,
                      cursor: "pointer", fontFamily: "inherit"
                    }}>
                    🚘 Set your preference
                  </button>
                )}
              </div>
            );
          })()}
          {/* ── Players grouped by team, collapsible, alphabetical ── */}
          {(() => {
            const lifts = selSess.lifts || {};
            // Group players by their primary team relevant to this session
            const ALL_SESS_TEAMS = [...new Set(selSess.players.flatMap(p => {
              const m = members.find(x => x.name === p);
              return (m?.teams || ["Unassigned"]);
            }))];
            // Sort teams: restricted team first, then alpha
            const sortedTeams = [...ALL_SESS_TEAMS].sort((a, b) => {
              if (a === selSess.restrictedTo) return -1;
              if (b === selSess.restrictedTo) return 1;
              return a.localeCompare(b);
            });
            // Build groups
            const groups = sortedTeams.map(team => ({
              team,
              players: [...selSess.players]
                .filter(p => {
                  const m = members.find(x => x.name === p);
                  const ts = m?.teams || [];
                  if (team === "Unassigned") return ts.length === 0;
                  return ts.includes(team);
                })
                .sort((a, b) => a.localeCompare(b)),
            })).filter(g => g.players.length > 0);

            // Deduplicate — each player appears in their first matching group only
            const seen = new Set();
            const dedupedGroups = groups.map(g => ({
              ...g,
              players: g.players.filter(p => { if (seen.has(p)) return false; seen.add(p); return true; })
            })).filter(g => g.players.length > 0);

            return dedupedGroups.map(({ team, players }) => (
              <PlayerGroup key={team} team={team} players={players} members={members}
                lifts={lifts} selSess={selSess} isSelf={p => currentUser?.name === p}
                cutoff={cutoff} canRemove={canOrCoach(userRole, "removePlayer", userMem, teams)}
                onRemove={p => handleLeave(selSess.id, p)}
                onCarpoolEdit={p => {
                  const lo = getLiftObj((selSess.lifts || {})[p]);
                  setLiftDraft({ ...lo }); setCarpoolSheetSess(selSess);
                }}
                onCarpoolSet={() => { setLiftDraft(null); setCarpoolSheetSess(selSess); }}
                single={dedupedGroups.length === 1}
              />
            ));
          })()}


          {/* Poll voting */}
          {selSess.poll && selSess.poll.length > 0 && (() => {
            const poll = selSess.poll;
            const totalVoters = [...new Set(poll.flatMap(o => o.votes || []))].length;
            const maxVotes = Math.max(...poll.map(o => (o.votes || []).length), 1);
            return (
              <div style={{ marginBottom: 20 }}>
                <SLbl mt={4}>Session Poll</SLbl>
                <div style={{
                  background: G.white, borderRadius: 12,
                  border: `1.5px solid ${G.border}`, padding: 14
                }}>
                  <div style={{
                    fontSize: 11, color: G.muted, fontWeight: 700, marginBottom: 12,
                    textTransform: "uppercase", letterSpacing: 1.2
                  }}>
                    {totalVoters} vote{totalVoters !== 1 ? "s" : ""}
                    {selSess.players.includes(currentUser.name)
                      ? " · tap to vote" : " · join session to vote"}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {poll.map(o => {
                      const votes = o.votes || [];
                      const hasVoted = votes.includes(currentUser.name);
                      const pct = Math.round((votes.length / maxVotes) * 100);
                      const canVote = selSess.players.includes(currentUser.name);
                      return (
                        <button key={o.id} type="button"
                          onClick={() => canVote && handleVote(selSess.id, o.id)}
                          style={{
                            width: "100%", textAlign: "left", border: "none",
                            background: "transparent", padding: 0,
                            cursor: canVote ? "pointer" : "default", fontFamily: "inherit"
                          }}>
                          <div style={{
                            display: "flex", justifyContent: "space-between",
                            alignItems: "center", marginBottom: 4
                          }}>
                            <span style={{
                              fontWeight: 800, fontSize: 14, color: G.text,
                              display: "flex", alignItems: "center", gap: 6
                            }}>
                              {hasVoted && <span style={{ color: G.green, fontSize: 13 }}>✓</span>}
                              {o.label}
                            </span>
                            <span style={{
                              fontSize: 12, fontWeight: 800,
                              color: hasVoted ? G.green : G.muted
                            }}>
                              {votes.length} {votes.length === 1 ? "vote" : "votes"}
                            </span>
                          </div>
                          {/* Vote bar */}
                          <div style={{
                            height: 8, borderRadius: 20,
                            background: G.border, overflow: "hidden"
                          }}>
                            <div style={{
                              height: "100%", borderRadius: 20,
                              width: `${pct}%`,
                              background: hasVoted ? G.green : "#a3e63580",
                              transition: "width .3s ease"
                            }} />
                          </div>
                          {/* Voter names */}
                          {votes.length > 0 && (
                            <div style={{ fontSize: 11, color: G.muted, marginTop: 3 }}>
                              {votes.map(v => v).join(", ")}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── Who's not coming (admins/captains see add button; members see read-only) ── */}
          {notIn.length > 0 && userInTeam && (() => {
            const myTs = userMem?.teams || [];
            const myTsSet = new Set(myTs);
            const grouped = ALL_TEAMS.reduce((acc, t) => {
              const list = notIn.filter(m =>
                t === "Unassigned" ? (m.teams || []).length === 0 : (m.teams || []).includes(t));
              if (list.length) acc[t] = list;
              return acc;
            }, {});
            const sortedKeys = Object.keys(grouped).sort((a, b) => {
              const aM = myTsSet.has(a), bM = myTsSet.has(b);
              if (aM && !bM) return -1; if (!aM && bM) return 1;
              return a.localeCompare(b);
            });
            let divShown = false;
            const isSelf = name => name === currentUser?.name;
            const label = canAddOthers ? "Add Players / Not Yet Signed Up" : "Not Yet Signed Up";
            return (<>
              {/* Toggle header */}
              <button onClick={() => setNotInExpanded(v => !v)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
                  padding: "4px 0 8px", marginTop: 4
                }}>
                <span style={{
                  fontSize: 12, fontWeight: 900, letterSpacing: 1.1,
                  textTransform: "uppercase", color: G.muted
                }}>
                  {label} ({notIn.length})
                </span>
                <span style={{ fontSize: 12, color: G.muted, fontWeight: 700 }}>
                  {notInExpanded ? "▲ hide" : "▼ show"}
                </span>
              </button>
              {notInExpanded && <>
                {sortedKeys.map((t, idx) => {
                  const isMine = myTsSet.has(t);
                  const showDiv = !isMine && !divShown && myTs.length > 0 && idx > 0;
                  if (showDiv) divShown = true;
                  return (
                    <React.Fragment key={t}>
                      {showDiv && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0 8px" }}>
                          <div style={{ flex: 1, height: 1, background: G.border }} />
                          <span style={{
                            fontSize: 10, fontWeight: 900, letterSpacing: 1.5,
                            color: G.muted, textTransform: "uppercase"
                          }}>Other Groups</span>
                          <div style={{ flex: 1, height: 1, background: G.border }} />
                        </div>
                      )}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ marginBottom: 6 }}><TeamPill team={t} /></div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                          {grouped[t].map(m => {
                            const self = isSelf(m.name);
                            const canAdd = canAddOthers || self;
                            return (
                              <button key={m.id}
                                onClick={canAdd ? () => handleJoinDetail(m.name) : undefined}
                                style={{
                                  background: canAdd ? G.white : "#f1f5f9",
                                  color: canAdd ? G.text : G.muted,
                                  border: `1.5px solid ${canAdd ? G.border : "#e2e8f0"}`,
                                  borderRadius: 24, padding: "7px 14px", fontSize: 13, fontWeight: 700,
                                  cursor: canAdd ? "pointer" : "default", fontFamily: "inherit",
                                  opacity: canAdd ? 1 : 0.65
                                }}>
                                {canAdd ? `+ ${m.name}` : m.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                {!canAddOthers && (
                  <div style={{ fontSize: 11, color: G.muted, marginBottom: 12, fontStyle: "italic" }}>
                    Only captains and admins can add other players.
                    {cutoff && " Sign-ups are locked — contact your captain."}
                  </div>
                )}
              </>}
            </>);
          })()}

          {/* ── Comments ─────────────────────────────────────── */}
          {(() => {
            const comments = selSess.comments || [];
            const isInSession = selSess.players.includes(currentUser?.name)
              || can(userRole, "deleteSession");
            const fmtTs = ts => {
              const d = new Date(ts);
              return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                + " · " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
            };
            return (
              <div style={{ marginTop: 24 }}>
                <div style={{
                  fontWeight: 900, fontSize: 12, letterSpacing: 1.2,
                  textTransform: "uppercase", color: G.muted, marginBottom: 10
                }}>
                  💬 Comments {comments.length > 0 && `(${comments.length})`}
                </div>

                {comments.length === 0 && (
                  <div style={{ fontSize: 12, color: G.muted, fontStyle: "italic", marginBottom: 10 }}>
                    No comments yet.{isInSession ? " Be the first!" : ""}
                  </div>
                )}

                {comments.map(c => (
                  <div key={c.id} style={{
                    background: G.cream, borderRadius: 10,
                    padding: "10px 13px", marginBottom: 7, position: "relative"
                  }}>
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      alignItems: "flex-start", gap: 8
                    }}>
                      <div>
                        <span style={{ fontWeight: 800, fontSize: 12, color: G.green }}>
                          {c.name}
                        </span>
                        <span style={{ fontSize: 11, color: G.muted, marginLeft: 8 }}>
                          {fmtTs(c.ts)}
                        </span>
                      </div>
                      {(c.name === currentUser?.name || can(userRole, "deleteSession")) && (
                        <button onClick={() => handleDeleteComment(selSess.id, c.id)}
                          style={{
                            background: "none", border: "none", color: G.muted,
                            fontSize: 14, cursor: "pointer", padding: "0 2px", lineHeight: 1,
                            flexShrink: 0
                          }}>×</button>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: G.text, marginTop: 4, lineHeight: 1.5 }}>
                      {c.text}
                    </div>
                  </div>
                ))}

                {isInSession ? (
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <input
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handlePostComment(selSess.id, commentText);
                        }
                      }}
                      placeholder="Add a comment…"
                      style={{ ...iSt({ flex: 1 }), fontSize: 13, padding: "9px 12px" }} />
                    <button onClick={() => handlePostComment(selSess.id, commentText)}
                      disabled={!commentText.trim()}
                      style={{
                        background: commentText.trim() ? G.green : "#e2e8f0",
                        color: commentText.trim() ? G.lime : G.muted,
                        border: "none", borderRadius: 10, padding: "9px 16px",
                        fontSize: 13, fontWeight: 800, cursor: commentText.trim() ? "pointer" : "default",
                        fontFamily: "inherit", flexShrink: 0, transition: "all .15s"
                      }}>
                      Post
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: G.muted, fontStyle: "italic" }}>
                    Join this session to leave a comment.
                  </div>
                )}
              </div>
            );
          })()}

          {can(userRole, "deleteSession") && (() => {
            const isRecurring = !!selSess.recurringId;
            const slot = isRecurring ? recurring.find(r => r.id === selSess.recurringId) : null;
            return (
              <div style={{ marginTop: 22 }}>
                {isRecurring && slot && (
                  <div style={{
                    background: "#fff7ed", border: "1.5px solid #fed7aa",
                    borderRadius: 10, padding: "11px 14px", marginBottom: 10, fontSize: 12,
                    color: "#92400e", lineHeight: 1.6
                  }}>
                    <b>⚠️ This is a recurring session</b> — it will regenerate automatically
                    unless you also stop the recurring slot "<b>{slot.name}</b>".
                    <label style={{
                      display: "flex", alignItems: "center", gap: 8,
                      marginTop: 9, cursor: "pointer", fontWeight: 700
                    }}>
                      <input type="checkbox" id="stopRecurring"
                        style={{ width: 16, height: 16, cursor: "pointer" }} />
                      Also delete the "{slot.name}" recurring slot
                    </label>
                  </div>
                )}
                <button onClick={() => {
                  if (isRecurring && slot && document.getElementById("stopRecurring")?.checked) {
                    deleteRecurringSlotSilent(slot.id);
                  }
                  handleDeleteSess(selSess.id);
                }}
                  style={{
                    display: "block", width: "100%",
                    background: "transparent", border: `1.5px solid ${G.red}`, color: G.red,
                    borderRadius: 10, padding: "11px", fontSize: 14, fontWeight: 800,
                    cursor: "pointer", fontFamily: "inherit"
                  }}>
                  🗑 Delete Session
                </button>
              </div>
            );
          })()}
        </div>
        <BotNav view="session" setView={setView} userRole={userRole} pendingCount={joinRequests.filter(r => r.status === "pending").length} />
        {toast && <Toast msg={toast} />}
        {carpoolSheetSess && <CarpoolSheet
          sess={carpoolSheetSess}
          sessions={sessions}
          myName={currentUser?.name}
          liftDraft={liftDraft}
          setLiftDraft={setLiftDraft}
          liftEditing={liftEditing}
          setLiftEditing={setLiftEditing}
          saveSessions={saveSessions}
          selSess={selSess}
          setSelSess={setSelSess}
          onClose={() => { setCarpoolSheetSess(null); setLiftDraft(null); setLiftEditing(false); }}
        />}
      </Shell>
    );
  }

  // ── ADMIN / MEMBERS ─────────────────────────────────────────
  // ════════════════════════════════════════════════════════════
  // RENDER: Profile
  // ════════════════════════════════════════════════════════════
  if (view === "profile" || (view === "admin" && !can(userRole, "accessMembers"))) {
    const me = members.find(m => m.id === currentUser.id) || currentUser;
    const myTeams = (me.teams || []);
    const { pct, needsReconfirm, isComplete, confirmedAt } = profileCompletion(me);
    const isReconfirm = pct === 100 && needsReconfirm;
    return (
      <Shell sidebar={<SidebarNav view={view} setView={setView} userRole={userRole}
        currentUser={currentUser} onLogout={handleLogout} />}>
        <AppHeader onBack={() => setView("schedule")}
          title="My Profile" sub={ROLE_META[me.role || "member"]?.label || "Member"} />
        <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Avatar + name card */}
          {(() => {
            const isFemTeam = myTeams.some(t => TEAM_META[t]?.feminine);
            const headerBg = isFemTeam
              ? "linear-gradient(135deg,#9d174d,#be185d)"
              : G.green;
            const avatarBg = isFemTeam ? "#fbcfe8" : G.lime;
            const avatarFg = isFemTeam ? "#9d174d" : G.green;
            return (
              <div style={{
                background: headerBg, borderRadius: 16, padding: "20px",
                display: "flex", alignItems: "center", gap: 16
              }}>
                {isFemTeam && <span style={{
                  position: "absolute", fontSize: 16,
                  top: 0, right: 8, opacity: .3, pointerEvents: "none"
                }}>✨</span>}
                <div style={{
                  width: 60, height: 60, borderRadius: "50%",
                  background: avatarBg, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, fontWeight: 900, color: avatarFg, flexShrink: 0
                }}>
                  {me.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: "'Playfair Display',serif", fontWeight: 900,
                    fontSize: 20, color: "#fff"
                  }}>{me.name}</div>
                  <div style={{ marginTop: 4, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <RolePill role={me.role || "member"} />
                    {myTeams.map(t => <TeamPill key={t} team={t} sm />)}
                    {myTeams.length === 0 && <TeamPill team="Unassigned" sm />}
                  </div>
                </div>
                {/* Completion dial */}
                {!isComplete && <ProfileDial pct={pct} />}
                {isComplete && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 28 }}>✅</div>
                    <div style={{
                      fontSize: 10, color: "rgba(255,255,255,.6)", fontWeight: 700,
                      letterSpacing: 1, textTransform: "uppercase", marginTop: 2
                    }}>Complete</div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Profile status card — only shown if incomplete or needs reconfirm */}
          {!isComplete && (
            <div style={{
              background: isReconfirm ? "#fffbeb" : "#fef2f2",
              border: `1.5px solid ${isReconfirm ? "#fcd34d" : "#fca5a5"}`,
              borderRadius: 12, padding: "14px 16px",
            }}>
              <div style={{
                fontWeight: 800, fontSize: 14,
                color: isReconfirm ? "#92400e" : "#991b1b", marginBottom: 6
              }}>
                {isReconfirm ? "⏰ Please reconfirm your details" : "📋 Profile incomplete"}
              </div>
              <div style={{
                fontSize: 13, color: isReconfirm ? "#b45309" : "#b91c1c",
                lineHeight: 1.5, marginBottom: 12
              }}>
                {isReconfirm
                  ? `It's been over 6 months since you last confirmed your details (${confirmedAt?.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) || "never"}). Please check they're still correct and confirm below.`
                  : "Your profile is missing contact details. The club needs these to reach you about training, matches and important updates."}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { icon: "📧", label: "Email", val: me.email, field: "email" },
                  { icon: "📱", label: "Phone", val: me.phone, field: "phone" },
                ].map(f => (
                  <div key={f.field} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    background: "rgba(255,255,255,.6)", borderRadius: 8, padding: "8px 10px"
                  }}>
                    <span style={{ fontSize: 16 }}>{f.icon}</span>
                    <span style={{ fontSize: 13, color: G.text, flex: 1 }}>{f.label}</span>
                    <span style={{
                      fontSize: 12, fontWeight: 800,
                      color: f.val ? "#16a34a" : "#dc2626"
                    }}>
                      {f.val ? "✓ Set" : "✗ Missing"}
                    </span>
                  </div>
                ))}
              </div>
              {isReconfirm && (
                <button type="button"
                  onClick={() => {
                    const now = new Date().toISOString();
                    const updated = members.map(m => m.id === currentUser.id
                      ? { ...m, profileConfirmedAt: now } : m);
                    saveMembers(updated);
                    const fresh = updated.find(m => m.id === currentUser.id);
                    setCurrentUser(fresh);
                    localStorage.setItem("fcc-current-user", JSON.stringify(fresh));
                    showToast("Details confirmed ✓");
                  }}
                  style={{
                    marginTop: 12, width: "100%", padding: "11px 0", borderRadius: 10,
                    border: "none", background: "#f59e0b", color: "#fff", fontWeight: 800,
                    fontSize: 14, cursor: "pointer", fontFamily: "inherit"
                  }}>
                  ✓ Yes, my details are still correct
                </button>
              )}
            </div>
          )}

          {/* Contact details */}
          <div style={{
            background: G.white, border: `1.5px solid ${G.border}`,
            borderRadius: 14, padding: "18px 16px"
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 14
            }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: G.text }}>Contact Details</div>
              {!profileEditing && (
                <button type="button" onClick={() => {
                  setProfileEmail(me.email || "");
                  setProfilePhone(me.phone || "");
                  setProfileEditing(true);
                }} style={{
                  background: G.cream, border: `1px solid ${G.border}`,
                  borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit", color: G.text
                }}>
                  ✏️ Edit
                </button>
              )}
            </div>
            {profileEditing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <FFld label="Email address">
                  <input type="email" placeholder="your@email.com"
                    style={iSt({ padding: "9px 12px", fontSize: 14 })}
                    value={profileEmail}
                    onChange={e => setProfileEmail(e.target.value)} />
                </FFld>
                <FFld label="Phone / Mobile">
                  <input type="tel" placeholder="+45 12 34 56 78"
                    style={iSt({ padding: "9px 12px", fontSize: 14 })}
                    value={profilePhone}
                    onChange={e => setProfilePhone(e.target.value)} />
                </FFld>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <Btn bg={G.green} col={G.lime} full onClick={() => {
                    // Save + auto-confirm if both fields now filled
                    const emailOk = profileEmail.trim().length > 0;
                    const phoneOk = profilePhone.trim().length > 0;
                    const now = new Date().toISOString();
                    const updated = members.map(m => m.id === currentUser.id
                      ? {
                        ...m,
                        email: profileEmail.trim(),
                        phone: profilePhone.trim(),
                        profileConfirmedAt: (emailOk && phoneOk) ? now : (m.profileConfirmedAt || null),
                      } : m);
                    saveMembers(updated);
                    const fresh = updated.find(m => m.id === currentUser.id);
                    setCurrentUser(fresh);
                    localStorage.setItem("fcc-current-user", JSON.stringify(fresh));
                    setProfileEditing(false);
                    showToast(emailOk && phoneOk ? "Profile complete ✓" : "Saved ✓");
                  }}>Save</Btn>
                  <Btn bg={G.cream} col={G.muted} onClick={() => setProfileEditing(false)}>Cancel</Btn>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>📧</span>
                  <div>
                    <div style={{
                      fontSize: 11, color: G.muted, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: 1
                    }}>Email</div>
                    <div style={{ fontSize: 14, color: me.email ? G.text : G.muted, fontWeight: 600 }}>
                      {me.email || "Not set yet"}
                    </div>
                  </div>
                </div>
                <div style={{ height: 1, background: G.border }} />
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>📱</span>
                  <div>
                    <div style={{
                      fontSize: 11, color: G.muted, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: 1
                    }}>Phone</div>
                    <div style={{ fontSize: 14, color: me.phone ? G.text : G.muted, fontWeight: 600 }}>
                      {me.phone || "Not set yet"}
                    </div>
                  </div>
                </div>
                {/* Last confirmed date */}
                {me.profileConfirmedAt && (
                  <div style={{ fontSize: 11, color: G.muted, marginTop: 4, fontStyle: "italic" }}>
                    Last confirmed: {new Date(me.profileConfirmedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    {" · "}Next check-in: {new Date(new Date(me.profileConfirmedAt).getTime() + 6 * 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Change PIN */}
          <div style={{
            background: G.white, border: `1.5px solid ${G.border}`,
            borderRadius: 14, padding: "18px 16px"
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: changingPin ? 14 : 0
            }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: G.text }}>🔐 Change PIN</div>
              {!changingPin && (
                <button type="button"
                  onClick={() => { setChangingPin(true); setPinMsg(""); }}
                  style={{
                    background: G.cream, border: `1px solid ${G.border}`,
                    borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit", color: G.text
                  }}>
                  Change
                </button>
              )}
            </div>
            {changingPin && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <FFld label="Current PIN">
                  <input type="password" inputMode="numeric" maxLength={4}
                    placeholder="••••" style={iSt({
                      padding: "9px 12px", fontSize: 18,
                      letterSpacing: 6, textAlign: "center"
                    })}
                    value={oldPin} onChange={e => setOldPin(e.target.value.replace(/\D/g, ""))} />
                </FFld>
                <FFld label="New PIN">
                  <input type="password" inputMode="numeric" maxLength={4}
                    placeholder="••••" style={iSt({
                      padding: "9px 12px", fontSize: 18,
                      letterSpacing: 6, textAlign: "center"
                    })}
                    value={newPin1} onChange={e => setNewPin1(e.target.value.replace(/\D/g, ""))} />
                </FFld>
                <FFld label="Confirm new PIN">
                  <input type="password" inputMode="numeric" maxLength={4}
                    placeholder="••••" style={iSt({
                      padding: "9px 12px", fontSize: 18,
                      letterSpacing: 6, textAlign: "center"
                    })}
                    value={newPin2} onChange={e => setNewPin2(e.target.value.replace(/\D/g, ""))} />
                </FFld>
                {pinMsg && <div style={{ color: "#dc2626", fontSize: 13, fontWeight: 700 }}>{pinMsg}</div>}
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn bg={G.green} col={G.lime} full onClick={handleChangePin}>Update PIN</Btn>
                  <Btn bg={G.cream} col={G.muted} onClick={() => {
                    setChangingPin(false); setOldPin(""); setNewPin1(""); setNewPin2(""); setPinMsg("");
                  }}>Cancel</Btn>
                </div>
              </div>
            )}
          </div>

          {/* ── My Availability ───────────────────────────────── */}
          {(() => {
            const myAbsences = (me.absences || []).sort((a, b) => a.from.localeCompare(b.from));
            const ABS_CATS = ["Holiday", "Work", "Injury", "Other"];
            const catColour = { Holiday: "#1e40af", Work: "#92400e", Injury: "#dc2626", Other: "#374151" };
            const catBg = { Holiday: "#eff6ff", Work: "#fffbeb", Injury: "#fef2f2", Other: "#f3f4f6" };
            const catBord = { Holiday: "#bfdbfe", Work: "#fde68a", Injury: "#fca5a5", Other: "#e5e7eb" };

            function saveAbsences(newList) {
              const updated = members.map(m => m.id === me.id ? { ...m, absences: newList } : m);
              saveMembers(updated);
            }

            function addAbsence() {
              if (!absFrom || !absTo) { showToast("Please pick start and end dates"); return; }
              if (absTo < absFrom) { showToast("End date must be on or after start date"); return; }
              // Find conflicting sessions
              const conflicts = sessions.filter(s =>
                s.players.includes(me.name) &&
                s.date >= absFrom && s.date <= absTo
              );
              if (conflicts.length > 0) {
                setAbsConflicts({ from: absFrom, to: absTo, cat: absCat, note: absNote, sessions: conflicts });
                return; // show nudge
              }
              commitAbsence(absFrom, absTo, absCat, absNote, []);
            }

            function commitAbsence(from, to, cat, note, sessionsToRemove) {
              const newAbs = { id: uid(), from, to, category: cat, note: note.trim() };
              saveAbsences([...myAbsences, newAbs]);
              if (sessionsToRemove.length > 0) {
                const updated = sessions.map(s => sessionsToRemove.find(c => c.id === s.id)
                  ? { ...s, players: s.players.filter(p => p !== me.name) } : s);
                saveSessions(updated);
              }
              setAbsFrom(""); setAbsTo(""); setAbsCat("Holiday"); setAbsNote("");
              setAbsConflicts(null);
              showToast(`Away period saved ✓${sessionsToRemove.length > 0 ? " · removed from " + sessionsToRemove.length + " session" + (sessionsToRemove.length > 1 ? "s" : "") : ""}`);
            }

            return (
              <div style={{
                background: G.white, border: `1.5px solid ${G.border}`,
                borderRadius: 12, padding: "14px 16px"
              }}>
                <div style={{
                  fontWeight: 900, fontSize: 14, color: G.text, marginBottom: 12,
                  display: "flex", alignItems: "center", gap: 8
                }}>
                  ✈️ My Availability
                </div>

                {/* Conflict nudge */}
                {absConflicts && (
                  <div style={{
                    background: "#fffbeb", border: "1.5px solid #fde68a",
                    borderRadius: 10, padding: "12px 14px", marginBottom: 14
                  }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: "#92400e", marginBottom: 6 }}>
                      ⚠️ You're signed up for {absConflicts.sessions.length} session{absConflicts.sessions.length > 1 ? "s" : ""} during this period
                    </div>
                    <div style={{ fontSize: 12, color: "#78350f", marginBottom: 10, lineHeight: 1.6 }}>
                      {absConflicts.sessions.map(s => `${fmtShort(s.date)} ${s.from}–${s.to}${s.label ? " · " + s.label : ""}`).join("\n")}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button onClick={() => commitAbsence(absConflicts.from, absConflicts.to, absConflicts.cat, absConflicts.note, absConflicts.sessions)}
                        style={{
                          flex: 1, background: "#92400e", color: "#fff", border: "none",
                          borderRadius: 9, padding: "9px 0", fontFamily: "inherit", fontWeight: 800,
                          fontSize: 12, cursor: "pointer"
                        }}>
                        Save &amp; remove me from those sessions
                      </button>
                      <button onClick={() => commitAbsence(absConflicts.from, absConflicts.to, absConflicts.cat, absConflicts.note, [])}
                        style={{
                          flex: 1, background: G.cream, color: G.muted, border: `1px solid ${G.border}`,
                          borderRadius: 9, padding: "9px 0", fontFamily: "inherit", fontWeight: 700,
                          fontSize: 12, cursor: "pointer"
                        }}>
                        Save &amp; keep me in sessions
                      </button>
                    </div>
                    <button onClick={() => setAbsConflicts(null)}
                      style={{
                        width: "100%", marginTop: 8, background: "none", border: "none",
                        fontSize: 12, color: G.muted, cursor: "pointer", fontFamily: "inherit"
                      }}>
                      Cancel
                    </button>
                  </div>
                )}

                {/* Existing absences */}
                {myAbsences.length > 0 && (
                  <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                    {myAbsences.map(a => (
                      <div key={a.id} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "9px 12px", borderRadius: 9,
                        background: catBg[a.category] || "#f3f4f6",
                        border: `1px solid ${catBord[a.category] || "#e5e7eb"}`
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontWeight: 700, fontSize: 13,
                            color: catColour[a.category] || G.text
                          }}>
                            {a.category}
                            {a.from === a.to
                              ? ` · ${fmtShort(a.from)}`
                              : ` · ${fmtShort(a.from)} – ${fmtShort(a.to)}`}
                          </div>
                          {a.note && <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>
                            {a.note}
                            <span style={{ fontStyle: "italic", opacity: .7 }}> (note visible to admins only)</span>
                          </div>}
                        </div>
                        <button onClick={() => saveAbsences(myAbsences.filter(x => x.id !== a.id))}
                          style={{
                            background: "none", border: "none", color: G.red,
                            fontSize: 18, cursor: "pointer", padding: "0 4px", lineHeight: 1
                          }}>×</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new absence */}
                {!absConflicts && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{
                          fontSize: 10, fontWeight: 700, color: G.muted,
                          display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1
                        }}>
                          From
                        </label>
                        <input type="date" value={absFrom}
                          onChange={e => { setAbsFrom(e.target.value); if (!absTo || absTo < e.target.value) setAbsTo(e.target.value); }}
                          min={todayStr()}
                          style={iSt({ fontSize: 13, padding: "8px 10px", borderRadius: 8 })} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{
                          fontSize: 10, fontWeight: 700, color: G.muted,
                          display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1
                        }}>
                          To
                        </label>
                        <input type="date" value={absTo}
                          onChange={e => setAbsTo(e.target.value)}
                          min={absFrom || todayStr()}
                          style={iSt({ fontSize: 13, padding: "8px 10px", borderRadius: 8 })} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {ABS_CATS.map(c => (
                        <button key={c} onClick={() => setAbsCat(c)}
                          style={{
                            padding: "5px 12px", borderRadius: 20, border: `1px solid ${absCat === c ? catBord[c] || G.green : "rgba(0,0,0,.1)"}`,
                            background: absCat === c ? (catBg[c] || G.cream) : "transparent",
                            color: absCat === c ? (catColour[c] || G.green) : G.muted,
                            fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit"
                          }}>
                          {c}
                        </button>
                      ))}
                    </div>
                    {absCat === "Other" && (
                      <input value={absNote} onChange={e => setAbsNote(e.target.value)}
                        placeholder="Brief reason (visible to admins only)…"
                        style={iSt({ fontSize: 13, padding: "8px 10px", borderRadius: 8 })} />
                    )}
                    <button onClick={addAbsence}
                      disabled={!absFrom || !absTo}
                      style={{
                        background: absFrom && absTo ? G.green : "rgba(0,0,0,.1)",
                        color: absFrom && absTo ? G.lime : G.muted, border: "none", borderRadius: 9,
                        padding: "10px 0", fontFamily: "inherit", fontWeight: 800, fontSize: 13,
                        cursor: absFrom && absTo ? "pointer" : "default", width: "100%"
                      }}>
                      + Mark as away
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Theme switcher */}
          <div style={{
            background: G.white, borderRadius: 14, border: `1.5px solid ${G.border}`,
            padding: "14px 16px"
          }}>
            <div style={{
              fontSize: 11, fontWeight: 900, letterSpacing: 1.5, color: G.muted,
              textTransform: "uppercase", marginBottom: 12
            }}>App Theme</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {THEME_KEYS.map(key => {
                const t = THEMES[key];
                const active = themeKey === key;
                return (
                  <button key={key} onClick={() => applyTheme(key)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      background: active ? t.headerBg : "transparent",
                      border: `2px solid ${active ? t.headerBg : G.border}`,
                      borderRadius: 10, padding: "10px 14px", cursor: "pointer",
                      fontFamily: "inherit", transition: "all .15s"
                    }}>
                    <span style={{ fontSize: 20 }}>{t.emoji}</span>
                    <span style={{
                      fontSize: 14, fontWeight: 700,
                      color: active ? "#fff" : G.text, flex: 1, textAlign: "left"
                    }}>
                      {t.label}
                    </span>
                    {active && <span style={{ fontSize: 12, color: "rgba(255,255,255,.7)", fontWeight: 700 }}>
                      Active ✓
                    </span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Help & Contact */}
          <button type="button" onClick={() => setView("help")}
            style={{
              background: G.white, border: `1.5px solid ${G.border}`,
              borderRadius: 12, padding: "13px 16px", fontFamily: "inherit",
              fontWeight: 700, fontSize: 14, color: G.text, cursor: "pointer",
              width: "100%", display: "flex", alignItems: "center", gap: 10, textAlign: "left"
            }}>
            <span style={{ fontSize: 20 }}>💬</span>
            <span style={{ flex: 1 }}>Help &amp; Contact Admin</span>
            <span style={{ color: G.muted, fontSize: 16 }}>›</span>
          </button>

          {/* Privacy & Data */}
          <button type="button" onClick={() => setView("privacy")}
            style={{
              background: G.white, border: `1.5px solid ${G.border}`,
              borderRadius: 12, padding: "13px 16px", fontFamily: "inherit",
              fontWeight: 700, fontSize: 14, color: G.text, cursor: "pointer",
              width: "100%", display: "flex", alignItems: "center", gap: 10, textAlign: "left"
            }}>
            <span style={{ fontSize: 20 }}>🔐</span>
            <span style={{ flex: 1 }}>Privacy &amp; Your Data</span>
            <span style={{ color: G.muted, fontSize: 16 }}>›</span>
          </button>

          {/* Sign out */}
          <button type="button" onClick={handleLogout}
            style={{
              background: "none", border: `1.5px solid ${G.border}`,
              borderRadius: 12, padding: "13px", fontFamily: "inherit",
              fontWeight: 800, fontSize: 14, color: G.muted, cursor: "pointer",
              width: "100%"
            }}>
            Sign out
          </button>

        </div>
        <BotNav view="profile" setView={setView} userRole={userRole} pendingCount={joinRequests.filter(r => r.status === "pending").length} />
        {toast && <Toast msg={toast} />}
      </Shell>
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: Help & Contact
  // ════════════════════════════════════════════════════════════
  if (view === "help") {
    const CATS = [
      { id: "general", label: "💬 General question" },
      { id: "booking", label: "📅 Booking / session issue" },
      { id: "account", label: "🔑 Account / login problem" },
      { id: "technical", label: "🛠️ Technical / app bug" },
      { id: "other", label: "📝 Other" },
    ];
    const me = members.find(m => m.id === currentUser.id) || currentUser;
    function sendHelp() {
      if (!helpMsg.trim()) { showToast("Please write a message first"); return; }
      const cat = CATS.find(c => c.id === helpCat)?.label || helpCat;
      // Fire email notification silently (no await — don't block the user)
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "help",
          data: { name: me.name, category: cat, message: helpMsg.trim() }
        })
      }).catch(() => { }); // silent — member shouldn't see API errors
      const subject = encodeURIComponent(`FCC Training App — ${cat} — from ${me.name}`);
      const body = encodeURIComponent(
        `Hi Reuben,\n\nA message from the FCC Training app:\n\n` +
        `Member: ${me.name}\nCategory: ${cat}\n\n` +
        `Message:\n${helpMsg.trim()}\n\n` +
        `---\nSent via FCC Training App`
      );
      window.open(`mailto:reuben.dayal@gmail.com?subject=${subject}&body=${body}`, "_self");
      setHelpMsg("");
      showToast("Message sent ✓");
      setTimeout(() => setView("profile"), 1200);
    }
    const QUICK_LINKS = [
      { icon: "📅", title: "Getting started", desc: "How to log in and set your PIN for the first time" },
      { icon: "🔁", title: "Weekly training", desc: "Your squad is auto-added — sign out if you can't make it" },
      { icon: "➕", title: "Booking nets", desc: "Prime time (17–20h) is 1 hour max. All other times 2 hours" },
      { icon: "🚘", title: "Car pool", desc: "Set a lift preference on any session — offer, need, or own transport" },
      { icon: "🧢", title: "Coaches", desc: "Coach names appear on team sessions automatically" },
      { icon: "🔒", title: "Sign-out deadline", desc: "You can leave a session until 9pm the night before" },
    ];
    return (
      <Shell sidebar={<SidebarNav view={view} setView={setView} userRole={userRole}
        currentUser={currentUser} onLogout={handleLogout} />}>
        <AppHeader title="Help & Guide" sub="Everything you need to know"
          onBack={() => setView("profile")} />
        <div style={{ padding: "16px 16px 100px", display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Full guide CTA */}
          <div style={{
            background: `linear-gradient(135deg,${G.green},${G.mid})`,
            borderRadius: 14, padding: "20px 18px",
            display: "flex", alignItems: "center", gap: 14
          }}>
            <div style={{ fontSize: 36, flexShrink: 0 }}>📖</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 15, color: G.lime, marginBottom: 4 }}>
                Full App Guide
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.8)", lineHeight: 1.5, marginBottom: 12 }}>
                Screenshots, step-by-step walkthroughs, and everything explained clearly.
              </div>
              <button
                onClick={() => window.open("https://training-app-guide.netlify.app", "_blank")}
                style={{
                  background: G.lime, color: G.green, border: "none", borderRadius: 20,
                  padding: "9px 20px", fontWeight: 900, fontSize: 13, cursor: "pointer",
                  fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6
                }}>
                Open Guide →
              </button>
            </div>
          </div>

          {/* Quick reference cards */}
          <div style={{
            fontSize: 11, fontWeight: 900, letterSpacing: 1.5, color: G.muted,
            textTransform: "uppercase", marginTop: 4
          }}>Quick reference</div>
          {QUICK_LINKS.map((q, i) => (
            <div key={i} style={{
              background: G.white, border: `1.5px solid ${G.border}`,
              borderRadius: 12, padding: "12px 14px",
              display: "flex", alignItems: "flex-start", gap: 12
            }}>
              <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>{q.icon}</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: G.text, marginBottom: 2 }}>{q.title}</div>
                <div style={{ fontSize: 12, color: G.muted, lineHeight: 1.5 }}>{q.desc}</div>
              </div>
            </div>
          ))}

          {/* Divider */}
          <div style={{ borderTop: `1px solid ${G.border}`, marginTop: 4 }} />
          <div style={{
            fontSize: 11, fontWeight: 900, letterSpacing: 1.5, color: G.muted,
            textTransform: "uppercase"
          }}>Still need help? Message Reuben</div>

          {/* Category picker */}
          <div style={{
            background: G.white, border: `1.5px solid ${G.border}`,
            borderRadius: 14, padding: "14px 16px"
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: G.muted, marginBottom: 10 }}>
              What's this about?
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {CATS.map(c => (
                <button key={c.id} onClick={() => setHelpCat(c.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: helpCat === c.id ? G.green : "transparent",
                    border: `1.5px solid ${helpCat === c.id ? G.green : G.border}`,
                    borderRadius: 9, padding: "9px 12px", cursor: "pointer",
                    fontFamily: "inherit", transition: "all .12s"
                  }}>
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: helpCat === c.id ? "#fff" : G.text, flex: 1, textAlign: "left"
                  }}>
                    {c.label}
                  </span>
                  {helpCat === c.id && <span style={{ color: G.lime, fontSize: 14, fontWeight: 800 }}>✓</span>}
                </button>
              ))}
            </div>
          </div>

          {helpCat === "technical" && (
            <div style={{
              background: "#fffbeb", border: "1.5px solid #fde68a",
              borderRadius: 12, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start"
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>📸</span>
              <div style={{ fontSize: 12, color: "#78350f", lineHeight: 1.6 }}>
                <b>Tip:</b> A screenshot really helps. After hitting send, attach it to the email.
                iPhone: <b>Side + Volume Up</b>. Android: <b>Power + Volume Down</b>.
              </div>
            </div>
          )}

          {/* Message box */}
          <div style={{
            background: G.white, border: `1.5px solid ${G.border}`,
            borderRadius: 14, padding: "14px 16px"
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: G.muted,
              textTransform: "uppercase", letterSpacing: 1, marginBottom: 10
            }}>Your message</div>
            <textarea rows={4}
              placeholder="Describe your question or issue…"
              value={helpMsg}
              onChange={e => setHelpMsg(e.target.value)}
              style={{
                width: "100%", borderRadius: 9, border: `1.5px solid ${G.border}`,
                padding: "11px 13px", fontSize: 14, fontFamily: "'DM Sans',sans-serif",
                fontWeight: 500, background: G.cream, color: G.text,
                outline: "none", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6
              }} />
            <div style={{ marginTop: 6, fontSize: 11, color: G.muted }}>
              Sending as: <b style={{ color: G.text }}>{me.name}</b>
            </div>
          </div>

          <Btn bg={G.green} col={G.lime} full onClick={sendHelp}>
            📧 Send Message to Reuben
          </Btn>

        </div>
        <BotNav view="profile" setView={setView} userRole={userRole} pendingCount={joinRequests.filter(r => r.status === "pending").length} />
        {toast && <Toast msg={toast} />}
      </Shell>
    );
  }

  // ── WEATHER ──────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════
  // RENDER: Privacy & Data
  // ════════════════════════════════════════════════════════════
  if (view === "privacy") {
    const me = members.find(m => m.id === currentUser.id) || currentUser;
    const isYouth = (me.teams || []).some(t => ["U11", "U13", "U15", "U15 Girls", "U18", "U16"].includes(t));
    return (
      <Shell sidebar={<SidebarNav view={view} setView={setView} userRole={userRole}
        currentUser={currentUser} onLogout={handleLogout} />}>
        <AppHeader title="Privacy & Your Data" sub="How Fredensborg CC uses your information"
          onBack={() => setView("profile")} />
        <div style={{ padding: "16px 16px 100px" }}>

          {/* Consent status */}
          <div style={{
            background: me.consentGiven ? "#f0fdf4" : "#fffbeb",
            border: `1.5px solid ${me.consentGiven ? "#86efac" : "#fde68a"}`,
            borderRadius: 12, padding: "14px 16px", marginBottom: 16,
            display: "flex", alignItems: "flex-start", gap: 12
          }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>{me.consentGiven ? "✅" : "⚠️"}</span>
            <div>
              <div style={{
                fontWeight: 800, fontSize: 13,
                color: me.consentGiven ? "#166534" : "#92400e", marginBottom: 3
              }}>
                {me.consentGiven
                  ? `Privacy acknowledged${me.consentDate ? " on " + me.consentDate : ""}`
                  : "You haven't acknowledged our privacy policy yet"}
              </div>
              <div style={{ fontSize: 12, color: me.consentGiven ? "#166534" : "#78350f", lineHeight: 1.5 }}>
                {me.consentGiven
                  ? "Your consent is on record. You can request changes or deletion at any time."
                  : "Tap below to acknowledge how we use your data."}
              </div>
              {!me.consentGiven && (
                <button onClick={() => {
                  const updated = members.map(m => m.id === me.id ? {
                    ...m,
                    consentGiven: true, consentDate: new Date().toISOString().slice(0, 10)
                  } : m);
                  saveMembers(updated);
                  showToast("Privacy policy acknowledged ✓");
                }}
                  style={{
                    marginTop: 10, background: "#92400e", color: "#fff", border: "none",
                    borderRadius: 20, padding: "7px 16px", fontSize: 12, fontWeight: 800,
                    cursor: "pointer", fontFamily: "inherit"
                  }}>
                  I acknowledge the privacy policy
                </button>
              )}
            </div>
          </div>

          {isYouth && !me.consentGiven && (
            <div style={{
              background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 10,
              padding: "12px 14px", marginBottom: 16, fontSize: 12, color: "#1e40af", lineHeight: 1.6
            }}>
              👶 <b>Youth member note:</b> A parent or guardian should also complete the
              account setup to formally record parental consent.
              Share this link with them: <b>fcc-training.vercel.app</b> → "Verify / Set up my account"
            </div>
          )}

          {/* Full policy sections */}
          {PRIVACY_SECTIONS.map((s, i) => (
            <div key={i} style={{
              background: G.white, border: `1.5px solid ${G.border}`,
              borderRadius: 12, padding: "14px 16px", marginBottom: 10
            }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: G.text, marginBottom: 6 }}>
                {s.title}
              </div>
              <div style={{ fontSize: 13, color: G.muted, lineHeight: 1.65 }}>
                {s.body}
              </div>
            </div>
          ))}

          {/* Request deletion */}
          <div style={{
            background: "#fef2f2", border: "1.5px solid #fca5a5",
            borderRadius: 12, padding: "14px 16px", marginTop: 4
          }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: "#991b1b", marginBottom: 6 }}>
              Request data deletion or access
            </div>
            <div style={{ fontSize: 12, color: "#7f1d1d", lineHeight: 1.6, marginBottom: 12 }}>
              To request a copy of your data or ask for your account to be deleted,
              contact the club admin. Your request will be handled within 30 days.
            </div>
            <button onClick={() => setView("help")}
              style={{
                background: "#991b1b", color: "#fff", border: "none", borderRadius: 20,
                padding: "8px 18px", fontSize: 12, fontWeight: 800, cursor: "pointer",
                fontFamily: "inherit"
              }}>
              Contact admin →
            </button>
          </div>

        </div>
        <BotNav view="profile" setView={setView} userRole={userRole}
          pendingCount={joinRequests.filter(r => r.status === "pending").length} />
        {toast && <Toast msg={toast} />}
      </Shell>
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: Team Availability
  // ════════════════════════════════════════════════════════════
  if (view === "availability") {
    const userMem = members.find(m => m.id === currentUser.id) || currentUser;
    const isAdmin = can(userRole, "accessMembers");
    const isCoach = isCoachMember(currentUser.name, teams);

    const myCoachTeams = teams.filter(t => (t.coaches || []).includes(currentUser.name)).map(t => t.name);
    const myPlayTeams = userMem.teams || [];
    const allVisible = [...new Set([...myCoachTeams, ...myPlayTeams])];
    const canSeeAll = isAdmin || myCoachTeams.length > 1;
    const teamOptions = isAdmin ? teams.map(t => t.name) : allVisible;

    // Default avTeam if not yet set
    const effectiveTeam = avTeam || myCoachTeams[0] || myPlayTeams[0] || (teams[0]?.name || "");

    const today = todayStr();
    const seasonEnd = "2026-09-30"; // full 2026 season

    const squadMembers = effectiveTeam === "All"
      ? members
      : members.filter(m => (m.teams || []).includes(effectiveTeam));

    const catColour = { Holiday: "#1e40af", Work: "#92400e", Injury: "#dc2626", Other: "#374151" };
    const catBg = { Holiday: "#eff6ff", Work: "#fffbeb", Injury: "#fef2f2", Other: "#f3f4f6" };

    function awayOn(date) { return squadMembers.filter(m => isAbsent(m, date)); }

    // Training sessions relevant to this team
    const relevantSessions = sessions
      .filter(s => s.date >= today && s.date <= seasonEnd)
      .filter(s => effectiveTeam === "All" ? true :
        (s.restrictedTo === effectiveTeam || (s.sessionTeams || []).includes(effectiveTeam) ||
          (!s.restrictedTo && s.players.some(p => {
            const m = members.find(x => x.name === p);
            return (m?.teams || []).includes(effectiveTeam);
          }))))
      .sort((a, b) => a.date.localeCompare(b.date) || a.from.localeCompare(b.from));

    // Matches relevant to this team — filter by division mapping
    const relevantMatches = ALL_FIXTURES
      .filter(f => f.date >= today && f.date <= seasonEnd)
      .filter(f => {
        if (effectiveTeam === "All") return true;
        // Map team name to divisions
        const divMap = {
          "Div 2": ["Div 2"],
          "Div 3": ["Div 3"],
          "Div 4": ["Div 4"],
          "T20 Serie 4": ["T20 Serie 4"],
          "T20 Serie 5": ["T20 Serie 5"],
          "Women's": ["Women's"],
          "OB": ["OB"],
          "U11": "U11",
          "U13": ["U13"], "U15": ["U15"],
          "U16": ["U16"], "U18": ["U18"],
        };
        const validDivs = divMap[effectiveTeam] || [];
        return validDivs.some(d => f.division.includes(d) || f.label.includes(d));
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    // Build a combined timeline — all unique dates with sessions + matches
    const allDates = [...new Set([
      ...relevantSessions.map(s => s.date),
      ...(showMatches ? relevantMatches.map(f => f.date) : []),
    ])].sort();

    return (
      <Shell sidebar={<SidebarNav view={view} setView={setView} userRole={userRole}
        currentUser={currentUser} onLogout={handleLogout} />}>
        <AppHeader title="Team Availability" sub="Full 2026 Season · Training &amp; Matches"
          onBack={() => setView("schedule")} />
        <div style={{ padding: "14px 16px 100px" }}>

          {/* Team selector */}
          <div style={{ marginBottom: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {canSeeAll && (
              <button onClick={() => setAvTeam("All")}
                style={{
                  padding: "6px 14px", borderRadius: 20,
                  border: `1px solid ${effectiveTeam === "All" ? G.green : G.border}`,
                  background: effectiveTeam === "All" ? G.green : G.white,
                  color: effectiveTeam === "All" ? G.lime : G.muted,
                  fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit"
                }}>
                All teams
              </button>
            )}
            {teamOptions.map(tn => {
              const tm = getTeamMeta(tn); const on = effectiveTeam === tn;
              return (
                <button key={tn} onClick={() => setAvTeam(tn)}
                  style={{
                    padding: "6px 14px", borderRadius: 20, border: "none",
                    background: on ? tm.bg : "rgba(0,0,0,.06)",
                    color: on ? tm.text : G.muted,
                    fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit"
                  }}>
                  {tn}
                </button>
              );
            })}
          </div>

          {/* Match overlay toggle */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            marginBottom: 16, padding: "8px 12px", background: G.cream,
            borderRadius: 10, border: `1px solid ${G.border}`
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: G.text, flex: 1 }}>
              🏏 Show match fixtures
            </span>
            <button onClick={() => setShowMatches(v => !v)}
              style={{
                width: 44, height: 24, borderRadius: 20, border: "none", cursor: "pointer",
                background: showMatches ? G.green : "#d1d5db",
                transition: "background .2s", position: "relative", flexShrink: 0
              }}>
              <span style={{
                position: "absolute", top: 2,
                left: showMatches ? 22 : 2, width: 20, height: 20,
                borderRadius: "50%", background: "#fff",
                transition: "left .2s", display: "block"
              }} />
            </button>
          </div>

          {/* Currently away banner */}
          {(() => {
            const awayNow = squadMembers.filter(m => isAbsent(m, today));
            if (!awayNow.length) return null;
            return (
              <div style={{
                background: "#fffbeb", border: "1.5px solid #fde68a",
                borderRadius: 12, padding: "12px 14px", marginBottom: 14
              }}>
                <div style={{ fontWeight: 800, fontSize: 12, color: "#92400e", marginBottom: 8 }}>
                  ✈️ Currently away ({awayNow.length})
                </div>
                {awayNow.map(m => {
                  const abs = (m.absences || []).find(a => a.from <= today && a.to >= today);
                  return (
                    <div key={m.id} style={{
                      display: "flex", alignItems: "center",
                      gap: 8, marginBottom: 4, fontSize: 12
                    }}>
                      <span style={{ fontWeight: 700, color: G.text }}>{m.name}</span>
                      <span style={{
                        fontSize: 10, padding: "1px 8px", borderRadius: 20, fontWeight: 700,
                        background: catBg[abs?.category] || "#f3f4f6",
                        color: catColour[abs?.category] || G.muted
                      }}>
                        {abs?.category || "Away"}
                      </span>
                      {abs?.to !== today && <span style={{ fontSize: 11, color: G.muted }}>
                        until {fmtShort(abs.to)}
                      </span>}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Combined timeline */}
          {allDates.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: G.muted, fontSize: 14 }}>
              Nothing coming up in the next 6 weeks
            </div>
          ) : allDates.map(date => {
            const daySessions = relevantSessions.filter(s => s.date === date);
            const dayMatches = showMatches ? relevantMatches.filter(f => f.date === date) : [];
            const awayList = awayOn(date);
            const awayCount = awayList.length;

            return (
              <div key={date} style={{ marginBottom: 16 }}>
                {/* Date row */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ fontWeight: 900, fontSize: 13, color: G.text, whiteSpace: "nowrap" }}>
                    {fmtShort(date)}
                  </div>
                  {awayCount > 0 && (
                    <div style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 700,
                      background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a",
                      whiteSpace: "nowrap"
                    }}>
                      ✈️ {awayCount} away
                    </div>
                  )}
                  <div style={{ flex: 1, height: 1, background: G.border }} />
                </div>

                {/* Match chips — shown prominently above training */}
                {dayMatches.map((f, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", marginBottom: 6, borderRadius: 10,
                    background: f.home ? "#f0fdf4" : "#f8fafc",
                    border: `1.5px solid ${f.home ? "#86efac" : "#e2e8f0"}`,
                  }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{f.home ? "🏠" : "✈️"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 13, color: G.text }}>{f.label}</div>
                      <div style={{ fontSize: 10, color: G.muted, marginTop: 1 }}>
                        {f.home ? "Home · Karlebo" : "Away"}
                        {effectiveTeam === "All" && <span style={{
                          marginLeft: 6, fontWeight: 700,
                          color: G.green
                        }}>{f.division}</span>}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: "2px 8px",
                      borderRadius: 20,
                      background: f.home ? "#dcfce7" : "#e2e8f0",
                      color: f.home ? "#166534" : "#475569",
                      flexShrink: 0
                    }}>
                      MATCH
                    </span>
                  </div>
                ))}

                {/* Training session cards */}
                {daySessions.map(s => {
                  const squad = effectiveTeam === "All" ? squadMembers : squadMembers.filter(m => (m.teams || []).includes(effectiveTeam));
                  const total = squad.length;
                  const inSess = s.players.filter(p => squad.some(m => m.name === p)).length;
                  const awayFromSess = awayList.filter(m => !s.players.includes(m.name));
                  const unaccounted = Math.max(0, total - inSess - awayFromSess.length);
                  const pctIn = total > 0 ? Math.round((inSess / total) * 100) : 0;

                  return (
                    <div key={s.id} style={{
                      background: G.white,
                      border: `1.5px solid ${G.border}`,
                      borderRadius: 10, padding: "12px 14px", marginBottom: 6
                    }}>
                      <div style={{
                        display: "flex", alignItems: "flex-start",
                        justifyContent: "space-between", marginBottom: 8
                      }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 13, color: G.text }}>
                            {s.label || "Training"}
                            {s.restrictedTo && <span style={{
                              marginLeft: 6, fontSize: 10,
                              fontWeight: 700, padding: "1px 6px", borderRadius: 20,
                              background: "#fef9c3", color: "#92400e"
                            }}>🔒 {s.restrictedTo}
                            </span>}
                          </div>
                          <div style={{ fontSize: 11, color: G.muted, marginTop: 1 }}>
                            {s.from}–{s.to}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <span style={{ fontWeight: 900, fontSize: 15, color: G.green }}>{inSess}</span>
                          <span style={{ fontSize: 11, color: G.muted }}> / {total}</span>
                        </div>
                      </div>

                      {/* Bar */}
                      {total > 0 && (
                        <div style={{
                          height: 6, borderRadius: 20, background: "#f1f5f9",
                          overflow: "hidden", display: "flex", marginBottom: 6
                        }}>
                          <div style={{
                            width: `${pctIn}%`, background: G.green,
                            borderRadius: "20px 0 0 20px", transition: "width .3s"
                          }} />
                          {awayFromSess.length > 0 && <div style={{
                            width: `${Math.round((awayFromSess.length / total) * 100)}%`,
                            background: "#fbbf24"
                          }} />}
                        </div>
                      )}

                      <div style={{
                        display: "flex", gap: 10, flexWrap: "wrap",
                        fontSize: 11, color: G.muted
                      }}>
                        <span>🟢 {inSess} confirmed</span>
                        {awayFromSess.length > 0 && <span>🟡 {awayFromSess.length} away</span>}
                        {unaccounted > 0 && <span>⚪ {unaccounted} unaccounted</span>}
                      </div>

                      {awayFromSess.length > 0 && (
                        <div style={{
                          marginTop: 8, paddingTop: 8,
                          borderTop: `1px solid ${G.border}`,
                          display: "flex", flexDirection: "column", gap: 3
                        }}>
                          {awayFromSess.map(m => {
                            const abs = (m.absences || []).find(a => a.from <= date && a.to >= date);
                            return (
                              <div key={m.id} style={{
                                display: "flex", alignItems: "center",
                                gap: 6, fontSize: 12
                              }}>
                                <span style={{ color: "#fbbf24" }}>✈️</span>
                                <span style={{ fontWeight: 700, color: G.text }}>{m.name}</span>
                                <span style={{
                                  fontSize: 10, padding: "1px 7px", borderRadius: 20,
                                  fontWeight: 700,
                                  background: catBg[abs?.category] || "#f3f4f6",
                                  color: catColour[abs?.category] || G.muted
                                }}>
                                  {abs?.category || "Away"}
                                </span>
                                {(isAdmin || isCoach) && abs?.note && (
                                  <span style={{ fontSize: 11, color: G.muted, fontStyle: "italic" }}>
                                    "{abs.note}"
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <BotNav view="schedule" setView={setView} userRole={userRole}
          pendingCount={joinRequests.filter(r => r.status === "pending").length} />
        {toast && <Toast msg={toast} />}
      </Shell>
    );
  }

  if (view === "weather") {
    return (
      <Shell sidebar={<SidebarNav view={view} setView={setView} userRole={userRole}
        currentUser={currentUser} onLogout={handleLogout} />}>
        <AppHeader title="Ground Forecast" sub="Karlebo · 55.918°N 12.416°E"
          onBack={() => setView("schedule")} />
        <WeatherPage wx={wxData} setView={setView} />
        <BotNav view="schedule" setView={setView} userRole={userRole}
          pendingCount={joinRequests.filter(r => r.status === "pending").length} />
        {toast && <Toast msg={toast} />}
      </Shell>
    );
  }
  if (view === "availability") {
    const fullSchedule = ALL_FIXTURES
      .map(f => ({
        ...f,
        coach: COACH_MAP[f.date] || "—"
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return (
      <Shell sidebar={<SidebarNav view={view} setView={setView} userRole={userRole}
        currentUser={currentUser} onLogout={handleLogout} />}>
        <AppHeader
          title="Team Availability"
          sub="Full 2026 Schedule + Coaches"
          onBack={() => setView("schedule")}
        />

        <div style={{ padding: "14px 16px 100px" }}>
          {fullSchedule.map((m, i) => (
            <div key={i} style={{
              background: G.white,
              border: `1.5px solid ${G.border}`,
              borderRadius: 12,
              padding: "14px",
              marginBottom: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,.06)"
            }}>
              <div style={{ fontWeight: 900, fontSize: 16, color: G.text, marginBottom: 4 }}>
                {fmtLong(m.date)}
              </div>
              <div style={{ fontSize: 14, color: G.muted, marginBottom: 8 }}>
                {m.label} • {m.division}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: G.green }}>
                Coach: {m.coach}
              </div>
            </div>
          ))}
        </div>

        <BotNav
          view="availability"
          setView={setView}
          userRole={userRole}
          pendingCount={joinRequests.filter(r => r.status === "pending").length}
        />
        {toast && <Toast msg={toast} />}
      </Shell>
    );
  }
  if (view === "admin" && can(userRole, "accessMembers")) {
    const namesNeedFix = userRole === "superadmin"
      ? members.filter(m => !m.name.includes(" ") && NAME_MAP[m.name])
      : [];
    const namesAmbiguous = userRole === "superadmin"
      ? members.filter(m => !m.name.includes(" ") && AMBIGUOUS_FIRST_NAMES.includes(m.name))
      : [];
    // Members who have a seed email but no stored email yet
    const emailsToSeed = userRole === "superadmin"
      ? members.filter(m => !m.email && EMAIL_SEED[m.name])
      : [];
    function seedAllEmails() {
      const updated = members.map(m =>
        !m.email && EMAIL_SEED[m.name] ? { ...m, email: EMAIL_SEED[m.name] } : m
      );
      saveMembers(updated);
      logAction("system", `Seeded ${emailsToSeed.length} email${emailsToSeed.length > 1 ? "s" : ""}: ${emailsToSeed.map(m => m.name).join(", ")}`);
      showToast(`${emailsToSeed.length} email${emailsToSeed.length > 1 ? "s" : ""} seeded ✓`);
    }
    // Members in SEED list but missing from live Firebase data (excluding dismissed)
    const existingNames = new Set(members.map(m => m.name.toLowerCase()));
    const dismissedSet = new Set(dismissedMissing.map(n => n.toLowerCase()));
    const membersToImport = userRole === "superadmin"
      ? SEED_MEMBERS.filter(m =>
        !existingNames.has(m.name.toLowerCase()) &&
        !dismissedSet.has(m.name.toLowerCase())
      )
      : [];
    function dismissMissingMember(name) {
      const updated = [...dismissedMissing, name];
      setDismissedMissing(updated);
      try { localStorage.setItem("fcc-dismissed-missing", JSON.stringify(updated)); } catch { }
    }
    function dismissAllMissing() {
      const updated = [...dismissedMissing, ...membersToImport.map(m => m.name)];
      setDismissedMissing(updated);
      try { localStorage.setItem("fcc-dismissed-missing", JSON.stringify(updated)); } catch { }
    }
    function importMissingMembers() {
      const toAdd = membersToImport.map(m => normMember({
        ...m,
        id: uid(), // give fresh IDs to avoid collisions
        email: EMAIL_SEED[m.name] || null,
      }));
      saveMembers([...members, ...toAdd]);
      logAction("system", `Imported ${toAdd.length} missing member${toAdd.length > 1 ? "s" : ""}: ${toAdd.map(m => m.name).join(", ")}`);
      showToast(`${toAdd.length} member${toAdd.length > 1 ? "s" : ""} added ✓`);
    }
    // Members who have a division assignment in DIVISION_TEAMS but not yet that team in Firebase
    const divisionUpdates = userRole === "superadmin"
      ? members.filter(m => {
        const div = DIVISION_TEAMS[m.name];
        return div && !(m.teams || []).includes(div);
      })
      : [];
    function applyDivisionTeams() {
      const updated = members.map(m => {
        const div = DIVISION_TEAMS[m.name];
        if (!div) return m;
        const existing = m.teams || [];
        if (existing.includes(div)) return m;
        return normMember({ ...m, teams: [...existing, div] });
      });
      saveMembers(updated);
      logAction("system", `Assigned division teams to ${divisionUpdates.length} member${divisionUpdates.length > 1 ? "s" : ""}: ${divisionUpdates.map(m => m.name + " → " + DIVISION_TEAMS[m.name]).join(", ")}`);
      showToast(`Division teams assigned ✓`);
    }

    return (
      <Shell>
        <AppHeader title="Manage Members"
          sub={`${members.length} members · ${teams.length} groups`}
          onBack={() => setView("schedule")} />

        {/* ── Admin section index ─────────────────────────────── */}
        <div style={{
          padding: "10px 16px 12px", borderBottom: `1px solid ${G.border}`,
          background: G.cream
        }}>
          <div style={{
            fontSize: 10, fontWeight: 900, letterSpacing: 1.5, color: G.muted,
            textTransform: "uppercase", marginBottom: 8
          }}>
            Jump to section
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { label: "👥 Members", id: "sec-members", key: "members" },
              { label: "➕ Add Member", id: "sec-add-member", key: "addmember" },
              { label: "🏏 Groups", id: "sec-groups", key: "groups" },
              { label: "🧢 Coaches", id: "sec-coaches", key: "coaches" },
              { label: "🚫 Block Nets", id: "sec-blocknets", key: "blocknets" },
              { label: "🔁 Recurring", id: "sec-recurring", key: "recurring" },
              { label: "👑 Audit Log", id: "sec-auditlog", key: "auditlog" },
            ].map(({ label, id, key }) => (
              <button key={id}
                onClick={() => {
                  // Open the section then scroll to it
                  setAdminSec(s => ({ ...s, [key]: true }));
                  setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
                }}
                style={{
                  padding: "5px 12px", borderRadius: 20,
                  border: `1px solid ${adminSec[key] ? G.green : G.border}`,
                  background: adminSec[key] ? `${G.green}12` : G.white,
                  color: adminSec[key] ? G.green : G.text,
                  fontSize: 11, fontWeight: 700, cursor: "pointer",
                  fontFamily: "inherit", whiteSpace: "nowrap", transition: "all .13s"
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: "14px 16px 20px" }}>

          {/* ── Members section ─────────────────────────────────── */}
          <div id="sec-members" />
          <button onClick={() => toggleAdminSec("members")}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
              padding: "8px 0", marginBottom: adminSec.members ? 8 : 14
            }}>
            <span style={{ fontWeight: 900, fontSize: 13, color: G.text }}>
              👥 Members &amp; Verifications
            </span>
            <span style={{ fontSize: 12, color: G.muted, fontWeight: 700 }}>
              {adminSec.members ? "▲ collapse" : "▼ show"}
            </span>
          </button>
          {adminSec.members && <>
            {/* ── Self-verified members (email confirmed, no action needed) ── */}
            {can(userRole, "addMember") && (() => {
              const verified = members.filter(m => m.emailVerified && !m.pin && !Object.keys(inviteCodes).find(id => id === m.id));
              if (!verified.length) return null;
              return (
                <div style={{
                  background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 12,
                  padding: "12px 14px", marginBottom: 12
                }}>
                  <div style={{
                    fontWeight: 800, fontSize: 12, color: "#166534", marginBottom: 8,
                    display: "flex", alignItems: "center", gap: 6
                  }}>
                    <span style={{
                      background: "#16a34a", color: "#fff", borderRadius: 99,
                      fontSize: 9, fontWeight: 900, padding: "1px 6px"
                    }}>{verified.length}</span>
                    ✅ Members who self-verified — generate invite codes to give them access
                  </div>
                  {verified.map(m => (
                    <div key={m.id} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 10px", background: G.white, borderRadius: 8, marginBottom: 6,
                      border: `1px solid ${G.border}`
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: G.text }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: G.muted }}>📧 {m.email}</div>
                      </div>
                      <Btn sm bg={G.green} col={G.lime}
                        onClick={() => {
                          const code = generateInviteCode(m.id);
                          setToast(`📋 Code for ${m.name.split(" ")[0]}: ${code}`);
                          setTimeout(() => setToast(null), 6000);
                        }}>
                        🎟️ Give Access
                      </Btn>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* ── Join Requests ──────────────────────────────────── */}
            <div id="sec-members" />
            {can(userRole, "addMember") && joinRequests.filter(r => r.status === "pending").length > 0 && (() => {
              const pending = joinRequests.filter(r => r.status === "pending");
              function approveRequest(req) {
                const playerTeam = req.playerTeam && req.playerTeam !== "I don't play / I'm a parent"
                  ? req.playerTeam : null;
                const newMember = normMember({
                  id: uid(),
                  name: req.playerName,
                  team: playerTeam,
                  teams: playerTeam ? [playerTeam] : [],
                  role: "member",
                  email: req.email || null,
                  phone: req.contact || null,
                  emailVerified: req.emailVerified || false,
                  consentGiven: req.consentGiven || false,
                  consentDate: req.consentDate || null,
                  note: req.parentName
                    ? `Parent: ${req.parentName}${req.contact ? " · " + req.contact : ""}`
                    : req.contact || null,
                });
                saveMembers([...members, newMember]);
                // Auto-generate invite code if email was verified
                if (req.emailVerified && newMember.id) {
                  setTimeout(() => generateInviteCode(newMember.id), 500);
                }
                saveJoinRequests(joinRequests.map(r => r.id === req.id ? { ...r, status: "approved" } : r));
                logAction("request", `Approved join request: ${req.playerName}${req.playerTeam ? " → " + req.playerTeam : ""}${req.forChild && req.parentName ? " (parent: " + req.parentName + ")" : ""}`);
                showToast(`${req.playerName} added ✓`);
              }
              function declineRequest(req) {
                saveJoinRequests(joinRequests.map(r => r.id === req.id ? { ...r, status: "declined" } : r));
                logAction("request", `Declined join request: ${req.playerName}`);
                showToast("Request declined");
              }
              return (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, marginTop: 4 }}>
                    <div style={{ flex: 1, height: 1, background: G.border }} />
                    <div style={{
                      fontSize: 10, fontWeight: 900, letterSpacing: 1.5, color: "#dc2626",
                      textTransform: "uppercase", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5
                    }}>
                      <span style={{
                        background: "#ef4444", color: "#fff", borderRadius: 99, fontSize: 9,
                        fontWeight: 900, padding: "1px 6px"
                      }}>{pending.length}</span>
                      Join Requests Pending
                    </div>
                    <div style={{ flex: 1, height: 1, background: G.border }} />
                  </div>

                  {pending.map(req => (
                    <div key={req.id} style={{
                      background: "#fff7ed", border: "1.5px solid #fed7aa",
                      borderRadius: 12, padding: "12px 14px", marginBottom: 10
                    }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 3 }}>
                            <span style={{ fontWeight: 800, fontSize: 14, color: G.text }}>
                              {req.forChild ? "👶 " : "🙋 "}{req.playerName}
                            </span>
                            {req.emailVerified && <span style={{
                              fontSize: 10, fontWeight: 700,
                              padding: "1px 7px", borderRadius: 20, background: "#dcfce7",
                              color: "#166534", border: "0.5px solid #86efac"
                            }}>✅ email verified</span>}
                          </div>
                          <div style={{ fontSize: 11, color: G.muted, lineHeight: 1.6 }}>
                            {req.playerTeam ? `Team: ${req.playerTeam}` : "No team specified"}
                            {req.forChild && req.parentName && ` · Parent: ${req.parentName}`}
                            {req.email && ` · ${req.email}`}
                            {req.contact && ` · ${req.contact}`}
                            <br />
                            <span style={{ color: "#9ca3af", fontSize: 10 }}>
                              {new Date(req.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button onClick={() => approveRequest(req)}
                          style={{
                            flex: 1, background: "#16a34a", color: "#fff", border: "none",
                            borderRadius: 9, padding: "9px 0", fontFamily: "inherit",
                            fontWeight: 800, fontSize: 12, cursor: "pointer"
                          }}>
                          ✓ Approve &amp; Add
                        </button>
                        <button onClick={() => declineRequest(req)}
                          style={{
                            background: "#fee2e2", color: "#dc2626", border: "none",
                            borderRadius: 9, padding: "9px 14px", fontFamily: "inherit",
                            fontWeight: 800, fontSize: 12, cursor: "pointer"
                          }}>
                          ✗ Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              );
            })()}
          </>}

          {/* ── Add Member section ──────────────────────────────── */}
          {can(userRole, "addMember") && <>
            <div id="sec-add-member" />
            <button onClick={() => toggleAdminSec("addmember")}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
                padding: "8px 0", marginBottom: adminSec.addmember ? 8 : 14
              }}>
              <span style={{ fontWeight: 900, fontSize: 13, color: G.text }}>➕ Add New Member</span>
              <span style={{ fontSize: 12, color: G.muted, fontWeight: 700 }}>
                {adminSec.addmember ? "▲ collapse" : "▼ show"}
              </span>
            </button>
            {adminSec.addmember && <>
              <div style={{
                background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10,
                padding: "10px 14px", marginBottom: 10, fontSize: 12, color: "#1e40af", lineHeight: 1.5
              }}>
                💡 New members can also self-register at login — tap <b>"Verify / Set up my account"</b> on the login screen. Use the form below for admin-initiated additions only.
              </div>
              <form onSubmit={addMember} style={{
                background: G.white, borderRadius: 12,
                border: `1.5px solid ${G.border}`, padding: 14, marginBottom: 20,
                display: "flex", flexDirection: "column", gap: 10
              }}>
                <FFld label="Full Name">
                  <input style={iSt()} placeholder="e.g. Arjun Sharma"
                    value={newName} onChange={e => setNewName(e.target.value)} required />
                </FFld>
                <FFld label="Group / Team">
                  <select style={iSt()} value={newTeam} onChange={e => setNewTeam(e.target.value)}>
                    {ALL_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </FFld>
                <FFld label="Email (optional)">
                  <input type="email" style={iSt()} placeholder="their@email.com"
                    value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                </FFld>
                <FFld label="Phone (optional)">
                  <input type="tel" style={iSt()} placeholder="+45 XX XX XX XX"
                    value={newPhone} onChange={e => setNewPhone(e.target.value)} />
                </FFld>
                <Btn type="submit" bg={G.green} col={G.lime} full>+ Add Member</Btn>
              </form>
            </>}{/* end adminSec.addmember */}
          </>}{/* end can addMember for addmember section */}

          {/* Role legend */}
          <div style={{
            background: G.white, borderRadius: 10, border: `1.5px solid ${G.border}`,
            padding: "10px 14px", marginBottom: 14
          }}>
            <div style={{
              fontSize: 10, fontWeight: 900, letterSpacing: 1.5, color: G.mid,
              textTransform: "uppercase", marginBottom: 8
            }}>Role Guide</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {ROLES.map(r => <RolePill key={r} role={r} />)}
            </div>
            <div style={{ fontSize: 11, color: G.muted, marginTop: 8, lineHeight: 1.6 }}>
              Captain & Vice Captain only available for Senior groups.<br />
              Youth groups are member-only. Toggle Senior/Youth in Manage Groups below.
            </div>
          </div>

          {/* Invite code guide */}
          {userRole === "superadmin" && (
            <div style={{
              background: "#f0f9ff", border: "1.5px solid #bae6fd", borderRadius: 10,
              padding: "10px 14px", marginBottom: 14
            }}>
              <div style={{
                fontSize: 10, fontWeight: 900, letterSpacing: 1.5, color: "#0369a1",
                textTransform: "uppercase", marginBottom: 6
              }}>🎟️ Invite Codes (for members without email)</div>
              <div style={{ fontSize: 11, color: "#0c4a6e", lineHeight: 1.7 }}>
                Members with <b>no email on file</b> and <b>no PIN yet</b> will show a <b>Gen Code</b> button.
                Tap it to generate a one-time code (e.g. <b>FCC-7K2P</b>), then share it with the member via WhatsApp.
                They'll enter it on first login to verify their identity before setting a PIN.
                Each code is single-use and expires after use.
              </div>
            </div>
          )}

          {/* ── Manage Groups ─────────────────────────────────── */}
          {can(userRole, "addMember") && <>
            <div id="sec-groups" />
            <button onClick={() => toggleAdminSec("groups")}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
                padding: "8px 0", marginBottom: adminSec.groups ? 8 : 14
              }}>
              <span style={{ fontWeight: 900, fontSize: 13, color: G.text }}>🏏 Manage Groups</span>
              <span style={{ fontSize: 12, color: G.muted, fontWeight: 700 }}>
                {adminSec.groups ? "▲ collapse" : "▼ show"}
              </span>
            </button>
            {adminSec.groups && <>
              <div style={{
                background: G.white, borderRadius: 12, border: `1.5px solid ${G.border}`,
                padding: 14, marginBottom: 20
              }}>

                {/* Existing teams */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                  {teams.map(t => (
                    <div key={t.id} style={{
                      display: "flex", alignItems: "center", gap: 7,
                      background: G.cream, borderRadius: 9, padding: "7px 10px"
                    }}>
                      {editingTeam?.id === t.id ? (
                        <input autoFocus style={{ ...iSt({ padding: "5px 9px", fontSize: 13 }), flex: 1 }}
                          value={editingTeam.name}
                          onChange={e => setEditingTeam({ ...editingTeam, name: e.target.value })}
                          onKeyDown={e => {
                            if (e.key === "Enter") { e.preventDefault(); renameTeam(t.id, editingTeam.name); }
                            if (e.key === "Escape") setEditingTeam(null);
                          }} />
                      ) : (
                        <span style={{ flex: 1, fontWeight: 800, fontSize: 13, color: G.text }}>{t.name}</span>
                      )}
                      {/* Senior / Youth toggle */}
                      <button type="button" onClick={() => toggleTeamSenior(t.id)}
                        title={t.senior ? "Senior (click to set Youth)" : "Youth (click to set Senior)"}
                        style={{
                          background: t.senior ? "#dcfce7" : "#f1f5f9", color: t.senior ? "#15803d" : "#64748b",
                          border: "none", borderRadius: 20, padding: "3px 9px", fontSize: 10, fontWeight: 800,
                          cursor: "pointer", flexShrink: 0, fontFamily: "inherit"
                        }}>
                        {t.senior ? "Senior" : "Youth"}
                      </button>
                      {/* Rename / confirm */}
                      {editingTeam?.id === t.id ? (
                        <button type="button" onClick={() => renameTeam(t.id, editingTeam.name)}
                          style={{
                            background: G.green, color: G.lime, border: "none", borderRadius: 7,
                            padding: "4px 9px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 800
                          }}>
                          ✓
                        </button>
                      ) : (
                        <button type="button" onClick={() => setEditingTeam({ id: t.id, name: t.name })}
                          style={{
                            background: "transparent", color: G.muted, border: `1px solid ${G.border}`,
                            borderRadius: 7, padding: "4px 8px", fontSize: 12, cursor: "pointer",
                            fontFamily: "inherit"
                          }}>
                          ✏️
                        </button>
                      )}
                      {/* Delete */}
                      <button type="button" onClick={() => deleteTeam(t.id)}
                        style={{
                          background: G.redBg, color: G.red, border: "none", borderRadius: 7,
                          padding: "4px 8px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 800
                        }}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new team */}
                <form onSubmit={addTeam} style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
                  <input style={{ ...iSt({ padding: "8px 11px", fontSize: 13 }), flex: 1, minWidth: 120 }}
                    placeholder="New group name…"
                    value={newTName} onChange={e => setNewTName(e.target.value)} />
                  <label style={{
                    display: "flex", alignItems: "center", gap: 5, fontSize: 12,
                    fontWeight: 700, color: G.text, cursor: "pointer", flexShrink: 0
                  }}>
                    <input type="checkbox" checked={newTSenior}
                      onChange={e => setNewTSenior(e.target.checked)}
                      style={{ width: 14, height: 14 }} />
                    Senior
                  </label>
                  <Btn type="submit" bg={G.green} col={G.lime}>+ Add</Btn>
                </form>
              </div>
            </>}

          </>}

          {/* ── Team Coaches ────────────────────────────────────── */}
          {can(userRole, "addMember") && <>
            <div id="sec-coaches" />
            <button onClick={() => toggleAdminSec("coaches")}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
                padding: "8px 0", marginBottom: adminSec.coaches ? 8 : 14
              }}>
              <span style={{ fontWeight: 900, fontSize: 13, color: G.text }}>🧢 Team Coaches</span>
              <span style={{ fontSize: 12, color: G.muted, fontWeight: 700 }}>
                {adminSec.coaches ? "▲ collapse" : "▼ show"}
              </span>
            </button>
            {adminSec.coaches && <>
              <div style={{
                background: G.white, borderRadius: 12, border: `1.5px solid ${G.border}`,
                padding: 14, marginBottom: 16
              }}>
                <div style={{ fontSize: 12, color: G.muted, marginBottom: 12, lineHeight: 1.5 }}>
                  Assign coaches to teams. Coaches appear on session cards and details.
                  This data will sync with the Trainer shift coordination system.
                </div>
                {teams.map(t => {
                  const tCoaches = t.coaches || [];
                  const search = coachSearch[t.id] || "";
                  const suggestions = search.trim().length > 1
                    ? members
                      .filter(m => m.name.toLowerCase().includes(search.toLowerCase()) && !tCoaches.includes(m.name))
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .slice(0, 6)
                    : [];
                  return (
                    <div key={t.id} style={{
                      marginBottom: 14, paddingBottom: 14,
                      borderBottom: `1px solid ${G.border}`
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <span style={{ fontWeight: 800, fontSize: 13, color: G.text }}>{t.name}</span>
                        <span style={{
                          fontSize: 10, color: G.muted, background: G.cream,
                          padding: "1px 7px", borderRadius: 20, border: `1px solid ${G.border}`
                        }}>
                          {t.senior ? "Senior" : "Youth"}
                        </span>
                      </div>
                      {/* Current coaches */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 6 }}>
                        {tCoaches.length === 0 && (
                          <span style={{ fontSize: 11, color: G.muted, fontStyle: "italic" }}>No coaches assigned</span>
                        )}
                        {tCoaches.map(name => (
                          <span key={name} style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                            background: "#fef9c3", color: "#92400e", border: "0.5px solid #fde68a"
                          }}>
                            🧢 {name}
                            <button onClick={() => {
                              saveTeams(teams.map(x => x.id === t.id
                                ? { ...x, coaches: tCoaches.filter(n => n !== name) } : x));
                              logAction("member", `Removed coach ${name} from ${t.name}`);
                            }} style={{
                              background: "none", border: "none", cursor: "pointer",
                              color: "#92400e", padding: 0, fontSize: 13, lineHeight: 1, fontWeight: 900
                            }}>
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      {/* Search to add */}
                      <div style={{ position: "relative" }}>
                        <input
                          placeholder="Search to add a coach…"
                          value={search}
                          onChange={e => setCoachSearch(s => ({ ...s, [t.id]: e.target.value }))}
                          style={iSt({ padding: "7px 10px", fontSize: 12, width: "100%", boxSizing: "border-box" })} />
                        {suggestions.length > 0 && (
                          <div style={{
                            position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
                            background: G.white, border: `1.5px solid ${G.border}`,
                            borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,.1)", marginTop: 2
                          }}>
                            {suggestions.map(m => (
                              <button key={m.id} type="button"
                                onClick={() => {
                                  saveTeams(teams.map(x => x.id === t.id
                                    ? { ...x, coaches: [...tCoaches, m.name] } : x));
                                  setCoachSearch(s => ({ ...s, [t.id]: "" }));
                                  logAction("member", `Added coach ${m.name} to ${t.name}`);
                                }}
                                style={{
                                  width: "100%", textAlign: "left", padding: "8px 12px",
                                  background: "none", border: "none", borderBottom: `1px solid ${G.border}`,
                                  cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                                  color: G.text
                                }}>
                                {m.name}
                                {getCoachTeams(m.name, teams).length > 0 && (
                                  <span style={{ fontSize: 10, color: G.muted, marginLeft: 6 }}>
                                    (also coaches: {getCoachTeams(m.name, teams).join(", ")})
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>}

          </>}

          {/* ── Block Nets Sessions ────────────────────────────── */}
          {can(userRole, "addMember") && <>
            <div id="sec-blocknets" />
            <button onClick={() => toggleAdminSec("blocknets")}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
                padding: "8px 0", marginBottom: adminSec.blocknets ? 8 : 14
              }}>
              <span style={{ fontWeight: 900, fontSize: 13, color: G.text }}>🚫 Block Nets Sessions</span>
              <span style={{ fontSize: 12, color: G.muted, fontWeight: 700 }}>
                {adminSec.blocknets ? "▲ collapse" : "▼ show"}
              </span>
            </button>
            {adminSec.blocknets && <>
              <div style={{
                background: G.white, borderRadius: 12, border: `1.5px solid ${G.border}`,
                padding: 14, marginBottom: 8
              }}>
                <div style={{ fontSize: 12, color: G.muted, marginBottom: 10, lineHeight: 1.5 }}>
                  Mark dates when the nets are unavailable (match days, events). Members will see these on the schedule.
                </div>
                {/* Import / sync 2026 fixtures */}
                {(() => {
                  // A block "looks like a fixture" if its label contains common fixture patterns
                  const fixturePatterns = /^(Div [234]|T20 S|OB —|Women'|U1[3568]|Serie [45]|2\. Div|3\. Div|4\. Div|U 1[356]|Kvinder|Oldboys)/i;
                  const existingFixtureBlocks = blockCals.filter(b => fixturePatterns.test(b.label));
                  const alreadyClean = MATCH_FIXTURES.every(f =>
                    blockCals.some(b => b.date === f.date && b.label === f.label));

                  function syncFixtures() {
                    // Remove ALL existing fixture-style blocks, then add the current MATCH_FIXTURES
                    const nonFixtureBlocks = blockCals.filter(b => !fixturePatterns.test(b.label));
                    const fresh = MATCH_FIXTURES.map(f => ({ ...f, id: uid() }));
                    const updated = [...nonFixtureBlocks, ...fresh];
                    saveBlockCals(updated);
                    logAction("blockcal", `Synced 2026 home match fixtures: ${fresh.length} blocks (removed ${existingFixtureBlocks.length} old)`);
                    showToast(`✓ ${fresh.length} match fixtures synced — ${existingFixtureBlocks.length} old blocks removed`);
                  }

                  if (alreadyClean) return (
                    <div style={{
                      background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 8,
                      padding: "9px 12px", marginBottom: 12, display: "flex",
                      alignItems: "center", justifyContent: "space-between", gap: 10
                    }}>
                      <div style={{ fontSize: 12, color: "#166534", fontWeight: 700 }}>
                        ✅ All {MATCH_FIXTURES.length} home fixtures synced
                      </div>
                      <button onClick={syncFixtures}
                        style={{
                          background: "none", border: "1px solid #bbf7d0", borderRadius: 8,
                          padding: "4px 10px", fontSize: 11, fontWeight: 700, color: "#166534",
                          cursor: "pointer", fontFamily: "inherit", flexShrink: 0
                        }}>
                        🔄 Re-sync
                      </button>
                    </div>
                  );

                  return (
                    <div style={{
                      background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 8,
                      padding: "10px 12px", marginBottom: 12
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 12, color: "#1e40af" }}>
                            🏏 Sync 2026 Home Fixtures
                          </div>
                          <div style={{ fontSize: 11, color: "#3b82f6", marginTop: 2 }}>
                            {MATCH_FIXTURES.length} fixtures in schedule
                            {existingFixtureBlocks.length > 0 && ` · ${existingFixtureBlocks.length} old blocks will be replaced`}
                          </div>
                        </div>
                        <button onClick={syncFixtures}
                          style={{
                            background: "#2563eb", color: "#fff", border: "none", borderRadius: 8,
                            padding: "7px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer",
                            fontFamily: "inherit", flexShrink: 0, whiteSpace: "nowrap"
                          }}>
                          Sync All
                        </button>
                      </div>
                      {existingFixtureBlocks.length > 0 && (
                        <div style={{
                          marginTop: 8, fontSize: 11, color: "#6b7280",
                          background: "#fef9c3", borderRadius: 6, padding: "6px 10px",
                          border: "0.5px solid #fde68a"
                        }}>
                          ⚠️ You have {existingFixtureBlocks.length} existing fixture blocks — clicking Sync will replace them all with the updated list ({MATCH_FIXTURES.length} fixtures). Any manually added event blocks will be kept.
                        </div>
                      )}
                    </div>
                  );
                })()}
                {/* ── DCF Schedule Upload ──────────────────────────── */}
                <div style={{
                  marginBottom: 14, padding: "12px 14px", background: G.cream,
                  borderRadius: 10, border: `1px solid ${G.border}`
                }}>
                  <div style={{ fontWeight: 800, fontSize: 12, color: G.text, marginBottom: 4 }}>
                    📥 Update from DCF Schedule (Excel)
                  </div>
                  <div style={{ fontSize: 11, color: G.muted, marginBottom: 10, lineHeight: 1.5 }}>
                    When DCF publishes a new schedule, upload the Excel file here.
                    The app will extract all Fredensborg home fixtures and let you review before applying.
                  </div>
                  <input type="file" accept=".xlsx,.xls"
                    onChange={async e => {
                      setXlsError(null); setXlsParsed(null);
                      const file = e.target.files?.[0]; if (!file) return;
                      try {
                        // Read file as ArrayBuffer then parse with SheetJS loaded dynamically
                        const buf = await file.arrayBuffer();
                        // Use SheetJS via CDN — inject script if not loaded
                        if (!window.XLSX) {
                          await new Promise((res, rej) => {
                            const s = document.createElement('script');
                            s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
                            s.onload = res; s.onerror = rej;
                            document.head.appendChild(s);
                          });
                        }
                        const wb = window.XLSX.read(buf, { type: 'array', cellDates: true });
                        const sheet = wb.Sheets[wb.SheetNames[0]];
                        const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                        // Find header row
                        const hIdx = rows.findIndex(r => String(r[0]).toLowerCase().includes('num') || String(r[3]).toLowerCase().includes('date') || String(r[4]).toLowerCase().includes('date'));
                        const dataRows = hIdx >= 0 ? rows.slice(hIdx + 1) : rows.slice(1);
                        // Parse: col indices based on known DCF format
                        // 0=num,1=series,2=division,3=match_type,4=date,5=time,6=team1,7=team2,8=ground
                        const fixtures = []; const allMatches = [];
                        dataRows.forEach(r => {
                          const team1 = String(r[6] || '').trim();
                          const team2 = String(r[7] || '').trim();
                          const ground = String(r[8] || '').trim();
                          const division = String(r[2] || '').trim();
                          if (!team1 && !team2) return;
                          const isFred = team1.includes('Fredensborg') || team2.includes('Fredensborg');
                          if (!isFred) return;
                          // Parse date
                          let dateStr = '';
                          const rawDate = r[4];
                          if (rawDate instanceof Date) {
                            dateStr = rawDate.toISOString().slice(0, 10);
                          } else if (rawDate) {
                            const d = new Date(String(rawDate).split('-').reverse().join('-'));
                            if (!isNaN(d)) dateStr = d.toISOString().slice(0, 10);
                          }
                          if (!dateStr) return;
                          const isHome = ground.toLowerCase().includes('fredensborg');
                          const opp = team1.includes('Fredensborg') ? team2 : team1;
                          const oppClean = opp.replace(/fredensborg\s*/i, '').trim();
                          // Label: shorten division name
                          const divShort = division
                            .replace('2026 Turnering', '').replace('2026 T20', 'T20')
                            .replace('3. Division Øst - B', 'Div 3').replace('2. Division', 'Div 2')
                            .replace('4. Division Øst', 'Div 4').replace('Kvinderækken', 'Women\'s')
                            .replace('Oldboys Grp B', 'OB').trim();
                          const label = `${divShort} — FCC vs ${oppClean}`;
                          // Parse time for start hour
                          let fromH = 10;
                          const ts = String(r[5] || '');
                          const tm = ts.match(/(\d+):(\d+)\s*(AM|PM)?/i);
                          if (tm) {
                            fromH = parseInt(tm[1]);
                            if (tm[3] && tm[3].toUpperCase() === 'PM' && fromH < 12) fromH += 12;
                          }
                          const from = `${String(fromH).padStart(2, '0')}:00`;
                          const isT20 = divShort.includes('T20') || divShort.includes('Serie');
                          const toH = isT20 ? Math.min(fromH + 8, 22) : Math.min(fromH + 9, 21);
                          const to = `${String(toH).padStart(2, '0')}:00`;
                          allMatches.push({ dateStr, label, isHome, division: divShort, opp: oppClean });
                          if (isHome) fixtures.push({ date: dateStr, from, to, label });
                        });
                        setXlsParsed({ fixtures, allMatches, fileName: file.name });
                        e.target.value = '';
                      } catch (err) {
                        setXlsError(`Could not parse file: ${err.message}`);
                        e.target.value = '';
                      }
                    }}
                    style={{
                      fontSize: 12, color: G.text, cursor: "pointer", fontFamily: "inherit",
                      marginBottom: xlsParsed || xlsError ? 8 : 0
                    }} />
                  {xlsError && (
                    <div style={{
                      fontSize: 12, color: G.red, background: G.redBg,
                      borderRadius: 8, padding: "8px 10px", marginTop: 6
                    }}>
                      ⚠️ {xlsError}
                    </div>
                  )}
                  {xlsParsed && (() => {
                    const { fixtures, allMatches, fileName } = xlsParsed;
                    const homeCount = fixtures.length;
                    const awayCount = allMatches.filter(m => !m.isHome).length;
                    // Compare with current blocks
                    const fixturePatterns = /^(Div [234]|T20 Series|OB —|Women'|U1[3568]|Serie [45]|2\. Div|3\. Div|4\. Div|U 1[356]|Kvinder|Oldboys)/i;
                    const existingFixBlocks = blockCals.filter(b => fixturePatterns.test(b.label));
                    const newDates = new Set(fixtures.map(f => f.date + f.label));
                    const oldDates = new Set(existingFixBlocks.map(b => b.date + b.label));
                    const toAdd = fixtures.filter(f => !oldDates.has(f.date + f.label));
                    const toRemove = existingFixBlocks.filter(b => !newDates.has(b.date + b.label));
                    return (
                      <div style={{
                        background: G.white, border: `1.5px solid ${G.border}`,
                        borderRadius: 10, padding: "12px 14px"
                      }}>
                        <div style={{ fontWeight: 800, fontSize: 12, color: G.text, marginBottom: 6 }}>
                          📋 Parsed: {fileName}
                        </div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                          <span style={{
                            fontSize: 11, background: "#f0fdf4", color: "#166534",
                            padding: "3px 9px", borderRadius: 20, fontWeight: 700
                          }}>
                            🏠 {homeCount} home fixtures
                          </span>
                          <span style={{
                            fontSize: 11, background: G.cream, color: G.muted,
                            padding: "3px 9px", borderRadius: 20, fontWeight: 700
                          }}>
                            ✈️ {awayCount} away
                          </span>
                          {toAdd.length > 0 && <span style={{
                            fontSize: 11, background: "#eff6ff",
                            color: "#1e40af", padding: "3px 9px", borderRadius: 20, fontWeight: 700
                          }}>
                            ➕ {toAdd.length} new
                          </span>}
                          {toRemove.length > 0 && <span style={{
                            fontSize: 11, background: "#fef2f2",
                            color: G.red, padding: "3px 9px", borderRadius: 20, fontWeight: 700
                          }}>
                            🗑 {toRemove.length} removed
                          </span>}
                        </div>
                        {toAdd.length === 0 && toRemove.length === 0 ? (
                          <div style={{ fontSize: 12, color: "#166534", fontWeight: 700 }}>
                            ✅ Already up to date — no changes needed
                          </div>
                        ) : (
                          <button onClick={() => {
                            const nonFixtureBlocks = blockCals.filter(b => !fixturePatterns.test(b.label));
                            const fresh = fixtures.map(f => ({ ...f, id: uid() }));
                            saveBlockCals([...nonFixtureBlocks, ...fresh]);
                            logAction("blockcal", `Updated fixtures from ${fileName}: +${toAdd.length} added, -${toRemove.length} removed, ${homeCount} total`);
                            showToast(`✓ Fixtures updated — ${homeCount} home matches`);
                            setXlsParsed(null);
                          }} style={{
                            background: G.green, color: G.lime, border: "none",
                            borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 800,
                            cursor: "pointer", fontFamily: "inherit", width: "100%"
                          }}>
                            ✓ Apply {homeCount} fixtures to Block Nets
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Existing blocks — show 5, rest behind toggle */}
                {(() => {
                  const upcoming = blockCals
                    .filter(b => isFuture(b.date) || b.date === todayStr())
                    .sort((a, b) => a.date.localeCompare(b.date));
                  const visible = showAllBlocks ? upcoming : upcoming.slice(0, 5);
                  return (<>
                    {upcoming.length === 0 && (
                      <div style={{ fontSize: 12, color: G.muted, fontStyle: "italic", marginBottom: 8 }}>
                        No upcoming blocked dates yet.
                      </div>
                    )}
                    {visible.map(b => (
                      <div key={b.id} style={{
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center", padding: "8px 10px", background: G.cream,
                        borderRadius: 8, marginBottom: 6, gap: 8
                      }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: G.text }}>{b.label}</div>
                          <div style={{ fontSize: 11, color: G.muted }}>{fmtShort(b.date)} · {b.from}–{b.to}</div>
                        </div>
                        <button onClick={() => {
                          saveBlockCals(blockCals.filter(x => x.id !== b.id));
                          logAction("blockcal", `Removed block: ${b.date} ${b.from}–${b.to} "${b.label}"`);
                        }}
                          style={{
                            background: "none", border: "none", color: G.red, fontSize: 16,
                            cursor: "pointer", padding: "2px 6px", lineHeight: 1
                          }}>×</button>
                      </div>
                    ))}
                    {upcoming.length > 5 && (
                      <button onClick={() => setShowAllBlocks(v => !v)}
                        style={{
                          background: "none", border: `1px dashed ${G.border}`, borderRadius: 8,
                          width: "100%", padding: "7px", fontSize: 12, fontWeight: 700, color: G.muted,
                          cursor: "pointer", fontFamily: "inherit", marginBottom: 6
                        }}>
                        {showAllBlocks
                          ? "▲ Show fewer"
                          : `▼ Show all ${upcoming.length} blocked dates`}
                      </button>
                    )}
                  </>);
                })()}
                {/* Add new block — prominent button */}
                <div style={{ marginTop: 8 }}>
                  {!showBlockForm ? (
                    <button type="button" onClick={() => setShowBlockForm(true)}
                      style={{
                        width: "100%", background: G.green, color: G.lime, border: "none",
                        borderRadius: 10, padding: "11px", fontSize: 13, fontWeight: 800,
                        cursor: "pointer", fontFamily: "inherit"
                      }}>
                      🚫 Block a Date When Nets Are Unavailable
                    </button>
                  ) : (
                    <div style={{
                      background: G.cream, borderRadius: 10, padding: "12px",
                      border: `1.5px solid ${G.border}`
                    }}>
                      <div style={{ fontWeight: 800, fontSize: 13, color: G.text, marginBottom: 10 }}>
                        🚫 Add a Blocked Date
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <FFld label="Reason / Event name">
                          <input placeholder="e.g. Div 3 Home Match vs Svanholm"
                            style={iSt({ padding: "9px 12px", fontSize: 13 })}
                            value={bCalLabel} onChange={e => setBCalLabel(e.target.value)} />
                        </FFld>
                        <FFld label="Date">
                          <input type="date" style={iSt({ padding: "9px 12px", fontSize: 13 })}
                            value={bCalDate} onChange={e => setBCalDate(e.target.value)} />
                        </FFld>
                        <div style={{ display: "flex", gap: 8 }}>
                          <FFld label="From" style={{ flex: 1 }}>
                            <input type="time" style={iSt({ padding: "9px 12px", fontSize: 13 })}
                              value={bCalFrom} onChange={e => setBCalFrom(e.target.value)} />
                          </FFld>
                          <FFld label="To" style={{ flex: 1 }}>
                            <input type="time" style={iSt({ padding: "9px 12px", fontSize: 13 })}
                              value={bCalTo} onChange={e => setBCalTo(e.target.value)} />
                          </FFld>
                        </div>
                        {/* Clash detection */}
                        {bCalDate && (() => {
                          const clash = blockCals.find(b => b.date === bCalDate &&
                            timesOverlap(bCalFrom, bCalTo, b.from, b.to));
                          return clash ? (
                            <div style={{
                              background: "#fff7ed", border: "1.5px solid #fed7aa",
                              borderRadius: 8, padding: "8px 11px", fontSize: 12, color: "#92400e"
                            }}>
                              ⚠️ <b>Clash:</b> "{clash.label}" is already blocked on this date
                              ({clash.from}–{clash.to}). Check before saving.
                            </div>
                          ) : null;
                        })()}
                        <div style={{ display: "flex", gap: 8 }}>
                          <Btn bg={G.green} col={G.lime} full onClick={() => {
                            if (!bCalDate) { showToast("Please pick a date"); return; }
                            const lbl = bCalLabel.trim() || "Nets Blocked";
                            saveBlockCals([...blockCals, {
                              id: uid(), date: bCalDate, from: bCalFrom, to: bCalTo, label: lbl
                            }]);
                            logAction("blockcal", `Blocked nets: ${bCalDate} ${bCalFrom}–${bCalTo} "${lbl}"`);
                            setBCalDate(""); setBCalFrom("10:00"); setBCalTo("14:00");
                            setBCalLabel(""); setShowBlockForm(false);
                            showToast("Date blocked ✓");
                          }}>✓ Save Blocked Date</Btn>
                          <Btn bg={G.cream} col={G.text} onClick={() => setShowBlockForm(false)}>
                            Cancel
                          </Btn>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>}

          </>}

          {/* ── Recurring Slots ───────────────────────────────── */}
          {can(userRole, "addMember") && <>
            <div id="sec-recurring" />
            <button onClick={() => toggleAdminSec("recurring")}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
                padding: "8px 0", marginBottom: adminSec.recurring ? 8 : 14
              }}>
              <span style={{ fontWeight: 900, fontSize: 13, color: G.text }}>🔁 Recurring Slots</span>
              <span style={{ fontSize: 12, color: G.muted, fontWeight: 700 }}>
                {adminSec.recurring ? "▲ collapse" : "▼ show"}
              </span>
            </button>
            {adminSec.recurring && <>
              <div style={{
                background: G.white, borderRadius: 12, border: `1.5px solid ${G.border}`,
                padding: 14, marginBottom: 20
              }}>
                <div style={{ fontSize: 12, color: G.muted, marginBottom: 12, lineHeight: 1.5 }}>
                  Recurring sessions auto-appear in the schedule up to 3 weeks ahead.
                  Toggle off to pause without deleting existing sessions.
                </div>

                {/* Existing slots */}
                {recurring.length === 0 && (
                  <div style={{ textAlign: "center", padding: "16px 0", color: G.muted, fontSize: 13 }}>
                    No recurring slots yet. Add one below.
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                  {recurring.map(slot => (
                    <div key={slot.id} style={{
                      background: slot.enabled ? G.cream : "#f1f5f9",
                      borderRadius: 10, padding: "10px 12px",
                      border: `1.5px solid ${slot.enabled ? G.border : "#cbd5e1"}`
                    }}>
                      {editingSlot?.id === slot.id ? (
                        // ─── Inline edit form ───────────────────────
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <input style={iSt({ padding: "7px 10px", fontSize: 13 })}
                            value={editingSlot.name}
                            onChange={e => setEditingSlot({ ...editingSlot, name: e.target.value })}
                            placeholder="Slot name" />
                          <div style={{ display: "flex", gap: 8 }}>
                            <select style={iSt({ padding: "7px 10px", fontSize: 13, flex: 1 })}
                              value={editingSlot.day}
                              onChange={e => setEditingSlot({ ...editingSlot, day: Number(e.target.value) })}>
                              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                            </select>
                            <input type="time" style={iSt({ padding: "7px 10px", fontSize: 13, flex: 1 })}
                              value={editingSlot.from}
                              onChange={e => setEditingSlot({ ...editingSlot, from: e.target.value })} />
                            <input type="time" style={iSt({ padding: "7px 10px", fontSize: 13, flex: 1 })}
                              value={editingSlot.to}
                              onChange={e => setEditingSlot({ ...editingSlot, to: e.target.value })} />
                          </div>
                          <div>
                            <div style={{
                              fontSize: 11, fontWeight: 700, color: G.muted,
                              textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6
                            }}>Teams</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {teams.map(t => {
                                const curTeams = editingSlot.teams || [editingSlot.team].filter(Boolean);
                                const sel = curTeams.includes(t.name);
                                return (
                                  <button key={t.id} type="button"
                                    onClick={() => {
                                      const updated = sel
                                        ? curTeams.filter(x => x !== t.name)
                                        : [...curTeams, t.name];
                                      setEditingSlot({
                                        ...editingSlot,
                                        teams: updated, team: updated[0] || ""
                                      });
                                    }}
                                    style={{
                                      background: sel ? G.green : G.cream, color: sel ? G.lime : G.text,
                                      border: sel ? `2px solid ${G.green}` : `1.5px solid ${G.border}`,
                                      borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 700,
                                      cursor: "pointer", fontFamily: "inherit", transition: "all .1s"
                                    }}>
                                    {sel ? "✓ " : ""}{t.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <label style={{
                            display: "flex", alignItems: "center", gap: 7, fontSize: 13,
                            fontWeight: 700, color: G.text, cursor: "pointer"
                          }}>
                            <input type="checkbox" checked={editingSlot.restrictTeam}
                              onChange={e => setEditingSlot({ ...editingSlot, restrictTeam: e.target.checked })} />
                            Restrict to this team only
                          </label>
                          {/* Net picker */}
                          <div>
                            <div style={{
                              fontSize: 11, fontWeight: 700, color: G.muted,
                              textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6
                            }}>Net</div>
                            <div style={{ display: "flex", gap: 6 }}>
                              {[["1", <><NetIcon color={editingSlot.net === "1" ? G.lime : G.text} size={13} /> Net 1</>],
                              ["2", <><NetIcon color={editingSlot.net === "2" ? G.lime : G.text} size={13} /> Net 2</>],
                              ["both", <><BothNetsIcon color={editingSlot.net === "both" ? G.lime : G.text} size={13} /> Both</>],
                              ].map(([val, lbl]) => (
                                <button key={val} type="button"
                                  onClick={() => setEditingSlot({ ...editingSlot, net: val })}
                                  style={{
                                    flex: 1, background: (editingSlot.net || "1") === val ? G.green : G.cream,
                                    color: (editingSlot.net || "1") === val ? G.lime : G.text,
                                    border: (editingSlot.net || "1") === val ? `2px solid ${G.green}` : `1.5px solid ${G.border}`,
                                    borderRadius: 9, padding: "7px 4px", fontSize: 12, fontWeight: 700,
                                    cursor: "pointer", fontFamily: "inherit", transition: "all .12s",
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 4
                                  }}>
                                  {lbl}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <FFld label="Active from">
                              <input type="date" style={iSt({ padding: "7px 10px", fontSize: 13 })}
                                value={editingSlot.activeFrom || ""}
                                onChange={e => setEditingSlot({ ...editingSlot, activeFrom: e.target.value })} />
                            </FFld>
                            <FFld label="Active until (blank = forever)">
                              <input type="date" style={iSt({ padding: "7px 10px", fontSize: 13 })}
                                value={editingSlot.activeTo || ""}
                                onChange={e => setEditingSlot({ ...editingSlot, activeTo: e.target.value })} />
                            </FFld>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <Btn bg={G.green} col={G.lime}
                              onClick={() => { updateRecurringSlot(slot.id, editingSlot); setEditingSlot(null); }}>
                              ✓ Save
                            </Btn>
                            <Btn bg={G.cream} col={G.muted} onClick={() => setEditingSlot(null)}>Cancel</Btn>
                          </div>
                        </div>
                      ) : (
                        // ─── Display row ────────────────────────────
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontWeight: 800, fontSize: 13, color: slot.enabled ? G.text : G.muted,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                            }}>
                              {slot.name}
                            </div>
                            <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>
                              {DAYS[slot.day]} · {slot.from}–{slot.to}
                              {" · "}<NetIcon color={G.muted} size={11} />{" "}
                              {slot.net === "both" ? "Both Nets" : `Net ${slot.net || "1"}`}
                              {(slot.teams?.length > 0 || slot.team) && ` · ${(slot.teams || [slot.team]).filter(Boolean).join(", ")}${slot.restrictTeam ? " only" : ""}`}
                              {slot.activeTo && ` · ends ${fmtShort(slot.activeTo)}`}
                            </div>
                          </div>
                          {/* Toggle on/off */}
                          <button type="button" onClick={() => toggleRecurringSlot(slot.id)}
                            style={{
                              background: slot.enabled ? "#dcfce7" : "#f1f5f9",
                              color: slot.enabled ? "#15803d" : "#94a3b8",
                              border: "none", borderRadius: 20, padding: "3px 10px", fontSize: 11,
                              fontWeight: 800, cursor: "pointer", flexShrink: 0, fontFamily: "inherit"
                            }}>
                            {slot.enabled ? "On" : "Off"}
                          </button>
                          {/* Edit */}
                          <button type="button"
                            onClick={() => setEditingSlot({ ...slot })}
                            style={{
                              background: "transparent", color: G.muted,
                              border: `1px solid ${G.border}`, borderRadius: 7,
                              padding: "4px 8px", fontSize: 12, cursor: "pointer", fontFamily: "inherit"
                            }}>
                            ✏️
                          </button>
                          {/* Delete */}
                          <button type="button" onClick={() => deleteRecurringSlot(slot.id)}
                            style={{
                              background: G.redBg, color: G.red, border: "none", borderRadius: 7,
                              padding: "4px 8px", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                              fontWeight: 800
                            }}>×</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add new slot form */}
                <div style={{ borderTop: `1px solid ${G.border}`, paddingTop: 12 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 800, color: G.mid, letterSpacing: 1.3,
                    textTransform: "uppercase", marginBottom: 10
                  }}>Add new slot</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input style={iSt({ padding: "9px 12px", fontSize: 13 })}
                      placeholder="Slot name e.g. U11 Saturday Training"
                      value={rName} onChange={e => setRName(e.target.value)} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <select style={iSt({ padding: "9px 10px", fontSize: 13, flex: 1 })}
                        value={rDay} onChange={e => setRDay(Number(e.target.value))}>
                        {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                      </select>
                      <input type="time" style={iSt({ padding: "9px 10px", fontSize: 13, flex: 1 })}
                        value={rFrom} onChange={e => setRFrom(e.target.value)} />
                      <input type="time" style={iSt({ padding: "9px 10px", fontSize: 13, flex: 1 })}
                        value={rTo} onChange={e => setRTo(e.target.value)} />
                    </div>
                    <div>
                      <div style={{
                        fontSize: 11, fontWeight: 700, color: G.muted,
                        textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6
                      }}>
                        Teams (tap to select, or leave empty for all)
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {teams.map(t => {
                          const sel = rTeam.includes(t.name);
                          return (
                            <button key={t.id} type="button"
                              onClick={() => setRTeam(ts => sel ? ts.filter(x => x !== t.name) : [...ts, t.name])}
                              style={{
                                background: sel ? G.green : G.cream, color: sel ? G.lime : G.text,
                                border: sel ? `2px solid ${G.green}` : `1.5px solid ${G.border}`,
                                borderRadius: 20, padding: "5px 12px", fontSize: 12, fontWeight: 700,
                                cursor: "pointer", fontFamily: "inherit", transition: "all .1s"
                              }}>
                              {sel ? "✓ " : ""}{t.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <label style={{
                      display: "flex", alignItems: "center", gap: 7, fontSize: 13,
                      fontWeight: 700, color: G.text, cursor: "pointer"
                    }}>
                      <input type="checkbox" checked={rRestrict}
                        onChange={e => setRRestrict(e.target.checked)} />
                      Restrict to this team only (others can view but not join)
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <FFld label="Active from">
                        <input type="date" style={iSt({ padding: "9px 10px", fontSize: 13 })}
                          value={rActiveFrom} onChange={e => setRActiveFrom(e.target.value)} />
                      </FFld>
                      <FFld label="Active until (blank = forever)">
                        <input type="date" style={iSt({ padding: "9px 10px", fontSize: 13 })}
                          value={rActiveTo} onChange={e => setRActiveTo(e.target.value)} />
                      </FFld>
                    </div>
                    <div>
                      <div style={{
                        fontSize: 11, fontWeight: 700, color: G.muted,
                        textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6
                      }}>
                        Net
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {[["1", <><NetIcon color={rNet === "1" ? G.lime : G.text} size={13} /> Net 1</>],
                        ["2", <><NetIcon color={rNet === "2" ? G.lime : G.text} size={13} /> Net 2</>],
                        ["both", <><BothNetsIcon color={rNet === "both" ? G.lime : G.text} size={13} /> Both</>],
                        ].map(([val, lbl]) => (
                          <button key={val} type="button" onClick={() => setRNet(val)}
                            style={{
                              flex: 1, background: rNet === val ? G.green : G.cream,
                              color: rNet === val ? G.lime : G.text,
                              border: rNet === val ? `2px solid ${G.green}` : `1.5px solid ${G.border}`,
                              borderRadius: 9, padding: "8px 4px", fontSize: 12, fontWeight: 700,
                              cursor: "pointer", fontFamily: "inherit", transition: "all .12s",
                              display: "flex", alignItems: "center", justifyContent: "center", gap: 5
                            }}>
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Btn bg={G.green} col={G.lime} full
                      onClick={() => {
                        if (!rName.trim()) { showToast("Give the slot a name"); return; }

                        const clashR = recurring.find(r => r.enabled && r.day === rDay && (r.net === "both" || rNet === "both" || r.net === rNet) && timesOverlap(rFrom, rTo, r.from, r.to));
                        if (clashR) { showToast(`🚫 Overlaps with existing recurring slot: "${clashR.name}"`); return; }

                        const clashS = sessions.find(s => {
                          if (!(s.net === "both" || rNet === "both" || s.net === rNet)) return false;
                          if (new Date(s.date).getDay() !== rDay) return false;
                          if (rActiveFrom && s.date < rActiveFrom) return false;
                          if (rActiveTo && s.date > rActiveTo) return false;
                          return timesOverlap(rFrom, rTo, s.from, s.to);
                        });
                        if (clashS) {
                          if (!window.confirm(`⚠️ Overlaps with manual session on ${fmtShort(clashS.date)}. Add anyway?`)) return;
                        }

                        addRecurringSlot({
                          name: rName.trim(), team: rTeam[0] || "", teams: rTeam, restrictTeam: rRestrict,
                          day: rDay, from: rFrom, to: rTo, net: rNet,
                          activeFrom: rActiveFrom, activeTo: rActiveTo || null,
                        });
                        setRName(""); setRTeam([]); setRRestrict(false);
                        setRDay(6); setRFrom("14:00"); setRTo("15:30");
                        setRActiveFrom(todayStr()); setRActiveTo(""); setRNet("1");
                      }}>
                      ↻ Add Recurring Slot
                    </Btn>
                  </div>
                </div>
              </div>
            </>}

            {/* ── Fix Names (superadmin only) ───────────────────── */}
            {(namesNeedFix.length > 0 || namesAmbiguous.length > 0) && (
              <div style={{
                background: "#fffbeb", border: "1.5px solid #fbbf24", borderRadius: 12,
                padding: "14px 16px", marginBottom: 16
              }}>
                <div style={{ fontWeight: 900, fontSize: 13, color: "#92400e", marginBottom: 6 }}>
                  ⚠️ Members with incomplete names detected
                </div>
                {namesNeedFix.length > 0 && <>
                  <div style={{ fontSize: 12, color: "#78350f", marginBottom: 10 }}>
                    <b>{namesNeedFix.length}</b> member{namesNeedFix.length > 1 ? "s" : ""} can be auto-fixed:{" "}
                    {namesNeedFix.map(m => m.name).join(", ")}
                  </div>
                  <Btn bg="#d97706" col="#fff" onClick={fixAllNames}>
                    Fix {namesNeedFix.length} Name{namesNeedFix.length > 1 ? "s" : ""} Automatically
                  </Btn>
                </>}
                {namesAmbiguous.length > 0 && (
                  <div style={{ fontSize: 12, color: "#78350f", marginTop: namesNeedFix.length ? 10 : 0 }}>
                    <b>{namesAmbiguous.length}</b> need manual fix (ambiguous — use ✏️ pencil below):{" "}
                    {namesAmbiguous.map(m => m.name).join(", ")}
                  </div>
                )}
              </div>
            )}

            {/* ── Seed Emails (superadmin only) ─────────────────── */}
            {emailsToSeed.length > 0 && (
              <div style={{
                background: "#eff6ff", border: "1.5px solid #93c5fd", borderRadius: 12,
                padding: "14px 16px", marginBottom: 16
              }}>
                <div style={{ fontWeight: 900, fontSize: 13, color: "#1e3a5f", marginBottom: 6 }}>
                  📧 Email addresses ready to import
                </div>
                <div style={{ fontSize: 12, color: "#1e40af", marginBottom: 10, lineHeight: 1.5 }}>
                  <b>{emailsToSeed.length}</b> member{emailsToSeed.length > 1 ? "s" : ""} have email data from the uniform order form that can be imported now.
                  This will also enable secure first-time login verification for those members.
                </div>
                <div style={{ fontSize: 11, color: "#3b82f6", marginBottom: 10 }}>
                  {emailsToSeed.map(m => m.name).join(", ")}
                </div>
                <Btn bg="#1e3a5f" col="#93c5fd" onClick={seedAllEmails}>
                  Import {emailsToSeed.length} Email{emailsToSeed.length > 1 ? "s" : ""} from Uniform Form
                </Btn>
              </div>
            )}

            {/* ── Missing Members (superadmin only) ────────────────── */}
            {membersToImport.length > 0 && (
              <div style={{
                background: "#f0fdf4", border: "1.5px solid #86efac",
                borderRadius: 12, padding: "14px 16px", marginBottom: 16
              }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginBottom: 6
                }}>
                  <div style={{ fontWeight: 900, fontSize: 13, color: "#14532d" }}>
                    👤 Members missing from app
                  </div>
                  <button onClick={dismissAllMissing}
                    style={{
                      background: "none", border: "1px solid #86efac", borderRadius: 7,
                      padding: "3px 9px", fontSize: 11, fontWeight: 700, color: "#166534",
                      cursor: "pointer", fontFamily: "inherit"
                    }}>
                    Dismiss all
                  </button>
                </div>
                <div style={{ fontSize: 12, color: "#166534", marginBottom: 10, lineHeight: 1.5 }}>
                  <b>{membersToImport.length}</b> member{membersToImport.length > 1 ? "s" : ""} are in the master list but haven't been added to the app yet.
                  Tap a name to dismiss it permanently if they've left the club.
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                  {membersToImport.map(m => (
                    <div key={m.name} style={{
                      display: "flex", alignItems: "center", gap: 0,
                      background: "#14532d", borderRadius: 20, overflow: "hidden"
                    }}>
                      <span style={{ fontSize: 11, color: "#4ade80", padding: "4px 10px", fontWeight: 600 }}>
                        {m.name}
                      </span>
                      <button onClick={() => dismissMissingMember(m.name)}
                        title="Dismiss — this person has left the club"
                        style={{
                          background: "rgba(255,255,255,.1)", border: "none", borderLeft: "1px solid rgba(255,255,255,.15)",
                          color: "#86efac", padding: "4px 8px", fontSize: 12, fontWeight: 900,
                          cursor: "pointer", fontFamily: "inherit", lineHeight: 1
                        }}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Btn bg="#14532d" col="#a3e635" onClick={importMissingMembers}>
                    Add {membersToImport.length} Missing Member{membersToImport.length > 1 ? "s" : ""}
                  </Btn>
                </div>
              </div>
            )}

            {/* ── Division Team Assignments ──────────────────────── */}
            {divisionUpdates.length > 0 && (
              <div style={{
                background: "#eff6ff", border: "1.5px solid #93c5fd",
                borderRadius: 12, padding: "14px 16px", marginBottom: 16
              }}>
                <div style={{ fontWeight: 900, fontSize: 13, color: "#1e3a5f", marginBottom: 6 }}>
                  🏏 Division team assignments ready
                </div>
                <div style={{ fontSize: 12, color: "#1e40af", marginBottom: 10, lineHeight: 1.5 }}>
                  <b>{divisionUpdates.length}</b> member{divisionUpdates.length > 1 ? "s" : ""} have a division squad assignment not yet reflected in the app.
                  This will add their division group without removing any existing groups.
                </div>
                <div style={{
                  fontSize: 11, background: "#1e3a5f", color: "#93c5fd",
                  borderRadius: 7, padding: "7px 10px", marginBottom: 10, lineHeight: 1.8
                }}>
                  {divisionUpdates.map(m => `${m.name} → ${DIVISION_TEAMS[m.name]}`).join(" · ")}
                </div>
                <Btn bg="#1e3a5f" col="#93c5fd" onClick={applyDivisionTeams}>
                  Assign Division Teams to {divisionUpdates.length} Member{divisionUpdates.length > 1 ? "s" : ""}
                </Btn>
              </div>
            )}

          </>}

          {/* ── Audit Log (superadmin only) ───────────────────── */}
          {userRole === "superadmin" && <>
            <div id="sec-auditlog" />
            <button onClick={() => toggleAdminSec("auditlog")}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
                padding: "8px 0", marginBottom: adminSec.auditlog ? 8 : 14
              }}>
              <span style={{ fontWeight: 900, fontSize: 13, color: G.text }}>👑 Audit Log</span>
              <span style={{ fontSize: 12, color: G.muted, fontWeight: 700 }}>
                {adminSec.auditlog ? "▲ collapse" : "▼ show"}
              </span>
            </button>
            {adminSec.auditlog && (() => {
              const CATEGORY_META = {
                member: { icon: "👤", label: "Member", col: "#0369a1", bg: "#e0f2fe" },
                role: { icon: "🏷️", label: "Role", col: "#7c3aed", bg: "#ede9fe" },
                team: { icon: "🏏", label: "Team", col: "#059669", bg: "#d1fae5" },
                session: { icon: "📅", label: "Session", col: "#d97706", bg: "#fef3c7" },
                recurring: { icon: "🔁", label: "Recurring", col: "#0891b2", bg: "#cffafe" },
                blockcal: { icon: "🚫", label: "Block", col: "#dc2626", bg: "#fee2e2" },
                pin: { icon: "🔑", label: "PIN", col: "#92400e", bg: "#fef3c7" },
                request: { icon: "✋", label: "Request", col: "#be185d", bg: "#fdf2f8" },
                system: { icon: "⚙️", label: "System", col: "#374151", bg: "#f3f4f6" },
              };
              const ROLE_COLOURS = {
                superadmin: "#86efac", admin: "#93c5fd", captain: "#c4b5fd",
                vicecaptain: "#a5b4fc", member: "#94a3b8",
              };
              const filtered = logFilter === "all"
                ? auditLog
                : auditLog.filter(e => e.category === logFilter);
              function fmtTs(ts) {
                const d = new Date(ts);
                return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                  + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
              }
              return (
                <>
                  <div style={{
                    background: "#0c1a2e", borderRadius: 14, overflow: "hidden",
                    border: "1.5px solid #1e3a5f", marginBottom: 20
                  }}>

                    {/* Header bar */}
                    <div style={{
                      padding: "12px 16px", display: "flex", alignItems: "center",
                      gap: 10, borderBottom: "1px solid #1e3a5f", cursor: "pointer"
                    }}
                      onClick={() => setLogOpen(o => !o)}>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: "#93c5fd", fontWeight: 900, fontSize: 13 }}>
                          Admin Activity Log
                        </div>
                        <div style={{ color: "#475569", fontSize: 11, marginTop: 1 }}>
                          {auditLog.length} action{auditLog.length !== 1 ? "s" : ""} recorded · visible only to you
                        </div>
                      </div>
                      <span style={{ color: "#475569", fontSize: 18, lineHeight: 1 }}>
                        {logOpen ? "▲" : "▼"}
                      </span>
                    </div>

                    {logOpen && (
                      <>
                        {/* Category filter chips */}
                        <div style={{
                          padding: "10px 12px", display: "flex", flexWrap: "wrap",
                          gap: 5, borderBottom: "1px solid #1e3a5f"
                        }}>
                          {["all", ...Object.keys(CATEGORY_META)].map(cat => {
                            const m = CATEGORY_META[cat];
                            const on = logFilter === cat;
                            return (
                              <button key={cat} onClick={() => setLogFilter(cat)}
                                style={{
                                  border: "none", borderRadius: 99, cursor: "pointer",
                                  fontFamily: "inherit", fontWeight: 700, fontSize: 10,
                                  padding: "3px 9px",
                                  background: on ? (m?.bg || "#3b82f6") : "#1e3a5f",
                                  color: on ? (m?.col || "#fff") : "#94a3b8",
                                  transition: "all .1s"
                                }}>
                                {m ? `${m.icon} ${m.label}` : "All"}
                              </button>
                            );
                          })}
                        </div>

                        {/* Log entries */}
                        <div style={{ maxHeight: 420, overflowY: "auto" }}>
                          {filtered.length === 0 && (
                            <div style={{
                              padding: "24px 16px", textAlign: "center",
                              color: "#475569", fontSize: 13
                            }}>
                              No actions recorded yet
                            </div>
                          )}
                          {filtered.map((entry, i) => {
                            const m = CATEGORY_META[entry.category] || CATEGORY_META.system;
                            const isMe = entry.byId === currentUser.id;
                            return (
                              <div key={entry.id} style={{
                                padding: "10px 14px",
                                borderBottom: i < filtered.length - 1 ? "1px solid #0f2240" : "none",
                                display: "flex", gap: 10, alignItems: "flex-start",
                              }}>
                                {/* Category dot */}
                                <div style={{
                                  marginTop: 2, width: 28, height: 28, borderRadius: "50%",
                                  background: m.bg, display: "flex", alignItems: "center",
                                  justifyContent: "center", fontSize: 13, flexShrink: 0
                                }}>
                                  {m.icon}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    fontSize: 12, color: "#e2e8f0", lineHeight: 1.4,
                                    wordBreak: "break-word"
                                  }}>
                                    {entry.detail}
                                  </div>
                                  <div style={{
                                    marginTop: 4, display: "flex",
                                    alignItems: "center", gap: 6, flexWrap: "wrap"
                                  }}>
                                    <span style={{
                                      fontSize: 10, fontWeight: 800,
                                      color: ROLE_COLOURS[entry.byRole] || "#94a3b8",
                                      background: "rgba(255,255,255,0.07)",
                                      padding: "1px 6px", borderRadius: 6
                                    }}>
                                      {isMe ? "👑 You" : entry.byName}
                                    </span>
                                    <span style={{ fontSize: 10, color: "#475569" }}>
                                      {fmtTs(entry.ts)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </>
              );
            })()}
          </>}

          {/* ── Team jump bar ─────────────────────────────────── */}
          {Object.keys(adminGrouped).length > 2 && (
            <div style={{
              background: G.white, border: `1.5px solid ${G.border}`,
              borderRadius: 14, padding: "14px 16px", marginBottom: 20,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}>
              <div style={{
                fontSize: 11, fontWeight: 900, letterSpacing: 1.8, color: G.mid,
                textTransform: "uppercase", marginBottom: 12,
                display: "flex", alignItems: "center", gap: 8
              }}>
                <span>⚡ Jump to team</span>
                <span style={{ flex: 1, height: 1, background: G.border, display: "block" }} />
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {Object.keys(adminGrouped).map(team => {
                  const meta = getTeamMeta(team);
                  const isFem = TEAM_META[team]?.feminine;
                  return (
                    <button key={team}
                      onClick={() => document.getElementById("team-section-" + team.replace(/\s+/g, "-"))
                        ?.scrollIntoView({ behavior: "smooth", block: "start" })}
                      style={{
                        background: isFem
                          ? "linear-gradient(135deg, #be185d, #9d174d)"
                          : meta.bg,
                        color: meta.text,
                        border: "none", borderRadius: 20, padding: "6px 14px",
                        fontSize: 12, fontWeight: 800, cursor: "pointer",
                        fontFamily: "inherit",
                        boxShadow: isFem ? "0 2px 8px rgba(190,24,93,0.35)" : "0 2px 5px rgba(0,0,0,.22)",
                      }}>
                      {isFem ? "✨ " : ""}{team}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search + filter — below team jump bar */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input style={iSt({ flex: 1, background: G.white })}
              placeholder="🔍  Search members…" value={aSearch}
              onChange={e => setASearch(e.target.value)} />
            <select style={iSt({ width: "auto", minWidth: 110, background: G.white, flexShrink: 0 })}
              value={aFilter} onChange={e => setAFilter(e.target.value)}>
              <option value="All">All groups</option>
              {ALL_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Member list */}
          {Object.entries(adminGrouped).map(([team, list]) => {
            const meta = getTeamMeta(team);
            const isFem = TEAM_META[team]?.feminine;
            const accentColor = isFem ? "#be185d" : meta.bg;
            return (
              <div key={team} id={"team-section-" + team.replace(/\s+/g, "-")}
                style={{
                  marginBottom: 24, scrollMarginTop: 80,
                  background: G.white,
                  border: `1.5px solid ${G.border}`,
                  borderLeft: `4px solid ${accentColor}`,
                  borderRadius: 14,
                  overflow: "hidden",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                }}>
                {/* Team header bar */}
                {isFem ? (
                  <div style={{
                    background: "linear-gradient(135deg,#fce7f3,#fdf2f8)",
                    borderBottom: "1.5px solid #f9a8d4", padding: "12px 16px",
                    display: "flex", alignItems: "center", gap: 8
                  }}>
                    <span style={{ fontSize: 18 }}>✨</span>
                    <div style={{ flex: 1 }}>
                      <span style={{
                        fontWeight: 900, fontSize: 15,
                        background: "linear-gradient(90deg,#9d174d,#be185d,#ec4899)",
                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
                      }}>
                        {team}
                      </span>
                      <span style={{ fontSize: 12, color: "#be185d", fontWeight: 700, marginLeft: 8 }}>
                        {list.length} player{list.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    background: `${accentColor}14`, borderBottom: `1px solid ${accentColor}30`,
                    padding: "10px 16px", display: "flex", alignItems: "center", gap: 8
                  }}>
                    <TeamPill team={team} />
                    <span style={{ fontSize: 12, color: G.muted, fontWeight: 700 }}>
                      {list.length} player{list.length !== 1 ? "s" : ""}
                    </span>
                    {seniorTeamNames.includes(team) && (
                      <span style={{ fontSize: 10, color: G.muted, fontWeight: 600, fontStyle: "italic" }}>
                        · Captain / VC eligible
                      </span>
                    )}
                  </div>
                )}
                {/* Member cards inside */}
                <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {list.map(m => (
                    <div key={m.id} style={{
                      background: isFem ? "#fff5f9" : G.bg,
                      border: `1px solid ${isFem ? "#fbcfe8" : G.border}`,
                      borderRadius: 10, padding: "10px 14px"
                    }}>

                      {/* Top row: name + pencil + delete */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        {editingName?.id === m.id ? (
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flex: 1 }}>
                            <input autoFocus
                              style={{ ...iSt({ padding: "5px 9px", fontSize: 13 }), flex: 1 }}
                              value={editingName.value}
                              onChange={e => setEditingName({ ...editingName, value: e.target.value })}
                              onKeyDown={e => {
                                if (e.key === "Enter") { e.preventDefault(); renameMember(m.id, editingName.value); }
                                if (e.key === "Escape") setEditingName(null);
                              }} />
                            <button type="button"
                              onClick={() => renameMember(m.id, editingName.value)}
                              style={{
                                background: G.green, color: G.lime, border: "none", borderRadius: 7,
                                padding: "5px 10px", fontSize: 13, cursor: "pointer",
                                fontFamily: "inherit", fontWeight: 800, flexShrink: 0
                              }}>✓</button>
                            <button type="button" onClick={() => setEditingName(null)}
                              style={{
                                background: G.cream, color: G.muted, border: `1px solid ${G.border}`,
                                borderRadius: 7, padding: "5px 9px", fontSize: 13, cursor: "pointer",
                                fontFamily: "inherit", flexShrink: 0
                              }}>✕</button>
                          </div>
                        ) : (
                          <>
                            <div style={{ fontWeight: 800, color: G.text, fontSize: 15, flex: 1 }}>
                              {m.name}
                            </div>
                            {can(userRole, "addMember") && (
                              <button type="button"
                                onClick={() => setEditingName({ id: m.id, value: m.name })}
                                style={{
                                  background: "none", border: "none", cursor: "pointer",
                                  color: G.muted, fontSize: 14, padding: "2px 4px", flexShrink: 0
                                }}
                                title="Edit name">✏️</button>
                            )}
                            {can(userRole, "removeMember") && m.id !== currentUser.id && (
                              <button type="button" onClick={() => setConfirmDelete(m)}
                                style={{
                                  background: G.redBg, color: G.red, border: "none", borderRadius: 7,
                                  padding: "4px 9px", fontSize: 13, cursor: "pointer",
                                  fontFamily: "inherit", fontWeight: 800, flexShrink: 0
                                }}>×</button>
                            )}
                          </>
                        )}
                      </div>

                      {/* Bottom row: role pill + team chips + role dropdown + reset PIN */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {/* Team chips */}
                        <div>
                          <div style={{
                            fontSize: 10, fontWeight: 800, color: G.muted,
                            letterSpacing: 1.3, textTransform: "uppercase", marginBottom: 5
                          }}>Teams</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                            {teams.map(t => {
                              const active = (m.teams || []).includes(t.name);
                              return (
                                <button key={t.id} type="button"
                                  onClick={() => toggleMemberTeam(m.id, t.name)}
                                  style={{
                                    background: active ? G.green : G.cream,
                                    color: active ? G.lime : G.muted,
                                    border: active ? `1.5px solid ${G.green}` : `1.5px solid ${G.border}`,
                                    borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 800,
                                    cursor: "pointer", fontFamily: "inherit", transition: "all .12s",
                                  }}>
                                  {active ? "✓ " : ""}{t.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        {/* Role + actions row */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <RolePill role={m.role || "member"} />
                          {can(userRole, "assignRoles") && (m.id !== currentUser.id || userRole === "superadmin") && (
                            <select
                              value={m.role || "member"}
                              onChange={e => updateRole(m.id, e.target.value)}
                              style={{
                                border: `1px solid ${G.border}`, borderRadius: 6, padding: "4px 6px", fontSize: 11,
                                fontFamily: "inherit", color: G.text, background: G.cream, cursor: "pointer"
                              }}>

                              {userRole === "superadmin" && <option value="superadmin">👑 Super Admin</option>}
                              <option value="admin">👨🏻‍💻 Admin</option>

                              {/* Normal senior captains */}
                              {(m.teams || []).some(t => seniorTeamNames.includes(t)) && <>
                                <option value="captain">👨‍✈ Captain</option>
                                <option value="vicecaptain">👷🏻‍♂️ Vice Captain</option>
                              </>}

                              {/* T20-only captains — your new roles */}
                              {(m.teams || []).some(t => ["T20 Serie 4", "T20 Serie 5"].includes(t)) && <>
                                <option value="t20captain">🦸‍♂ T20 Captain</option>
                                <option value="t20vicecaptain">🥷🏻 T20 Vice Captain</option>
                              </>}

                              <option value="member">🏏 Member</option>
                            </select>
                          )}
                          {can(userRole, "resetOtherPin") && m.id !== currentUser.id && pins[m.id] && (
                            <Btn onClick={() => resetPin(m.id)} bg={G.amberBg} col={G.amber} sm>🔑 Reset PIN</Btn>
                          )}
                          {/* Invite code — for members with no PIN and no active code */}
                          {can(userRole, "resetOtherPin") && !pins[m.id] && !inviteCodes[m.id] && (
                            <Btn sm bg="#f0f9ff" col="#0369a1"
                              onClick={() => {
                                const code = generateInviteCode(m.id);
                                // Show in a non-blocking overlay using the toast — slightly longer
                                setToast(`📋 Code for ${m.name.split(" ")[0]}: ${code} — share via WhatsApp`);
                                setTimeout(() => setToast(null), 6000);
                              }}>
                              🎟️ Gen Code
                            </Btn>
                          )}
                          {/* Show if code already exists — with option to regenerate */}
                          {can(userRole, "resetOtherPin") && !pins[m.id] && inviteCodes[m.id] && (
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <span style={{
                                fontSize: 10, color: "#0369a1", fontWeight: 700,
                                background: "#e0f2fe", borderRadius: 6, padding: "3px 7px"
                              }}>
                                🎟️ Code active
                              </span>
                              <Btn sm bg="#f0f9ff" col="#0369a1"
                                onClick={() => {
                                  const code = generateInviteCode(m.id);
                                  setToast(`📋 New code for ${m.name.split(" ")[0]}: ${code} — share via WhatsApp`);
                                  setTimeout(() => setToast(null), 6000);
                                }}>
                                ↻ New
                              </Btn>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  ))}
                </div>{/* end padding wrapper */}
              </div>
            );
          })}
        </div>
        <BotNav view="admin" setView={setView} userRole={userRole} pendingCount={joinRequests.filter(r => r.status === "pending").length} />
        {toast && <Toast msg={toast} />}

        {/* ── Delete confirmation modal ── */}
        {confirmDelete && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
            zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24
          }}>
            <div style={{
              background: G.white, borderRadius: 16, padding: 28, maxWidth: 340, width: "100%",
              boxShadow: "0 8px 40px rgba(0,0,0,0.18)"
            }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>🗑️</div>
              <div style={{ fontWeight: 900, fontSize: 17, color: G.text, marginBottom: 8 }}>
                Remove member?
              </div>
              <div style={{ color: G.muted, fontSize: 14, marginBottom: 6 }}>
                You're about to permanently remove:
              </div>
              <div style={{ fontWeight: 800, fontSize: 16, color: G.green, marginBottom: 6 }}>
                {confirmDelete.name}
              </div>
              <div style={{
                color: "#b91c1c", fontSize: 13, marginBottom: 22,
                background: G.redBg, borderRadius: 8, padding: "10px 12px"
              }}>
                ⚠️ This cannot be undone. All their session history will remain but they will no longer appear in the member list.
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button"
                  onClick={() => setConfirmDelete(null)}
                  style={{
                    flex: 1, padding: "11px 0", borderRadius: 10, border: `1.5px solid ${G.border}`,
                    background: G.cream, color: G.text, fontWeight: 800, fontSize: 14,
                    cursor: "pointer", fontFamily: "inherit"
                  }}>
                  Cancel
                </button>
                <button type="button"
                  onClick={() => removeMember(confirmDelete.id)}
                  style={{
                    flex: 1, padding: "11px 0", borderRadius: 10, border: "none",
                    background: "#dc2626", color: "#fff", fontWeight: 800, fontSize: 14,
                    cursor: "pointer", fontFamily: "inherit"
                  }}>
                  Yes, Remove
                </button>
              </div>
            </div>
          </div>
        )}
      </Shell>
    );
  }

  // Fallback
  return <Shell><div style={{ padding: 20, color: G.muted }}>Loading…</div></Shell>;
}
